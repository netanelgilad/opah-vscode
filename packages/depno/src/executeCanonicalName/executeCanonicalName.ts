import template from '@babel/template';
import * as types from '@babel/types';
import { stringLiteral } from '@babel/types';
import { Map } from 'immutable';
import { CanonicalName } from '../CanonicalName';
import { Definition } from '../Definition';
import { forkProgram } from '../forkProgram';
import { getExecutionProgramForDefinition } from '../getExecutionCodeForDefinition/getExecutionProgramForDefinition';

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

  const program = await getExecutionProgramForDefinition(
    Definition({
      expression,
      references: Map([[mainFunctionName, canonicalName]]),
    })
  );

  return forkProgram(program, opts.cwd || process.cwd())
}
