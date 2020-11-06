import template from '@babel/template';
import * as types from '@babel/types';
import { stringLiteral } from '@babel/types';
import { ChildProcess, fork } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { file } from 'tempy';
import { Bundle } from './Bundle';
import { bundleCanonicalName } from './bundleCanonicalName';
import {
  CanonicalName,
  fullyQualifiedIdentifier,
} from './fullyQualifiedIdentifier';
import { generateCodeFromBundle } from './generateCodeFromBundle';
import { replaceReferencesWithCanonicalNamesInBundle } from './replaceReferencesWithCanonicalNamesInBundle';
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

  const functionCanonicalName = {
    uri,
    name: exportedFunctionName,
  };

  const bundle = await bundleCanonicalName(functionCanonicalName);

  return executeBundle(functionCanonicalName, args, bundle, {
    cwd: opts.cwd,
    silent,
  });
}

export type ExecutionBundle = Bundle & {
  expression: types.ExpressionStatement;
};

async function executeBundle(
  functionCanonicalName: CanonicalName,
  args: any[],
  bundle: Bundle,
  opts: {
    cwd?: string;
    silent?: boolean;
  }
) {
  const bundleAfterMacros = await runMacrosInBundle(bundle);

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

  const expression = types.expressionStatement(
    types.callExpression(
      types.identifier(
        fullyQualifiedIdentifier(
          functionCanonicalName.uri,
          functionCanonicalName.name
        )
      ),
      mappedArgs
    )
  );

  const executionBundle = await replaceReferencesWithCanonicalNamesInBundle({
    ...bundleAfterMacros,
    expression,
  });

  const code = await generateCodeFromBundle(executionBundle);

  const tmpFile = file({ extension: 'mjs' });

  writeFileSync(tmpFile, code);

  return fork(tmpFile, [], {
    cwd: opts.cwd,
    silent: opts.silent,
    execArgv: ['--unhandled-rejections=strict'],
  });
}
