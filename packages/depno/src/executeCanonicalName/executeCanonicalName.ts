import template from '@babel/template';
import * as types from '@babel/types';
import { stringLiteral } from '@babel/types';
import { fork } from 'child_process';
import { writeFileSync } from 'fs';
import { Map } from 'immutable';
import { file } from 'tempy';
import { Definition } from '../Definition';
import { CanonicalName } from '../CanonicalName';
import { getExecutionCodeForDefinition } from '../getExecutionCodeForDefinition/getExecutionCodeForDefinition';

export async function executeCanonicalName(
  canonicalName: CanonicalName,
  args: any[] = [],
  opts: {
    cwd?: string;
    silent?: boolean;
  } = {
    silent: true,
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

  const code = await getExecutionCodeForDefinition(
    Definition({
      expression,
      references: Map([[mainFunctionName, canonicalName]]),
    })
  );

  const tmpFile = file({ extension: 'js' });

  writeFileSync(tmpFile, code);

  return fork(tmpFile, [], {
    cwd: opts.cwd,
    silent: opts.silent,
    execArgv: ['--unhandled-rejections=strict'],
  });
}
