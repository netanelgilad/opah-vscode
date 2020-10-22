import template from '@babel/template';
import * as types from '@babel/types';
import { stringLiteral } from '@babel/types';
import { ChildProcess, fork } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { file } from 'tempy';
import { bundleCanonicalName } from './bundleCanonicalName';
import {
  CaononicalDefinitionNode,
  MacroFunction,
} from './bundleDefinitionsForPath2';
import {
  CanonicalName,
  fullyQualifiedIdentifier,
} from './fullyQualifiedIdentifier';
import { generateCodeFromBundle } from './generateCodeFromBundle';
import { runMacrosInBundle } from './runMacrosInBundle';

export async function runFile(
  path: string,
  opts: {
    exportedFunctionName?: string;
    args?: any[];
    cwd?: string;
    silent?: boolean;
  } = {}
): Promise<ChildProcess> {
  const silent = opts.silent ?? true;
  const args = opts.args ?? [];
  const exportedFunctionName = opts.exportedFunctionName ?? 'default';
  const uri = path.startsWith('.')
    ? resolve(opts.cwd || process.cwd(), path)
    : path;

  const bundle = await createExecutionBundle(
    {
      uri,
      name: exportedFunctionName,
    },
    args
  );

  return executeBundle(bundle, {
    cwd: opts.cwd,
    silent,
  });
}

export type ExecutionBundle = {
  expression: types.Expression;
  definitions: Map<string, CaononicalDefinitionNode>;
  macros: Map<string, MacroFunction>;
};

async function createExecutionBundle(
  functionCanonicalName: CanonicalName,
  args: any[]
): Promise<ExecutionBundle> {
  const mappedArgs = args.map(x => {
    if (x === '__stdin__') {
      return ((template`process.stdin`() as unknown) as types.ExpressionStatement)
        .expression;
    } else if (x === '__stdout__') {
      return ((template`process.stdout`() as unknown) as types.ExpressionStatement)
        .expression;
    } else {
      return stringLiteral(typeof x === 'string' ? x : JSON.stringify(x));
    }
  });
  const { definitions, macros } = await bundleCanonicalName(
    functionCanonicalName
  );

  const expression = types.callExpression(
    types.identifier(
      fullyQualifiedIdentifier(
        functionCanonicalName.uri,
        functionCanonicalName.name
      )
    ),
    mappedArgs
  );

  return {
    expression,
    definitions,
    macros,
  };
}

async function executeBundle(
  bundle: ExecutionBundle,
  opts: {
    cwd?: string;
    silent?: boolean;
  }
) {
  const bundleAfterMacros = await runMacrosInBundle(bundle);
  const code = await generateCodeFromBundle(bundleAfterMacros);

  const tmpFile = file({ extension: 'mjs' });

  writeFileSync(tmpFile, code);

  return fork(tmpFile, [], {
    cwd: opts.cwd,
    silent: opts.silent,
    execArgv: ['--unhandled-rejections=strict'],
  });
}
