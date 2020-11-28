import template from '@babel/template';
import * as types from '@babel/types';
import { stringLiteral } from '@babel/types';
import { ChildProcess, fork } from 'child_process';
import { writeFileSync } from 'fs';
import { Map } from 'immutable';
import { resolve } from 'path';
import { file } from 'tempy';
import { Bundle, Definition, emptyBundle, ExecutionBundle } from './Bundle';
import { bundleCanonicalName } from './bundleCanonicalName';
import { CanonicalName } from './fullyQualifiedIdentifier';
import { generateCodeFromBundle } from './generateCodeFromBundle';

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

  const functionCanonicalName = CanonicalName({
    uri,
    name: exportedFunctionName,
  });

  const [, , bundle] = await bundleCanonicalName(
    Map(),
    Map(),
    emptyBundle(),
    functionCanonicalName
  );

  return executeBundle(functionCanonicalName, args, bundle, {
    cwd: opts.cwd,
    silent,
  });
}

async function executeBundle(
  functionCanonicalName: CanonicalName,
  args: any[],
  bundle: Bundle,
  opts: {
    cwd?: string;
    silent?: boolean;
  }
) {
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

  const mainFunctionName = 'main';

  const { expression } = types.expressionStatement(
    types.callExpression(types.identifier(mainFunctionName), mappedArgs)
  );

  const executionBundle: ExecutionBundle = ExecutionBundle({
    definitions: bundle,
    execute: Definition({
      expression,
      references: Map([[mainFunctionName, functionCanonicalName]]),
    }),
  });

  const code = generateCodeFromBundle(executionBundle);

  const tmpFile = file({ extension: 'js' });

  writeFileSync(tmpFile, code);

  return fork(tmpFile, [], {
    cwd: opts.cwd,
    silent: opts.silent,
    execArgv: ['--unhandled-rejections=strict'],
  });
}
