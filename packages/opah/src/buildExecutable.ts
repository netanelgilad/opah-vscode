import { writeFileSync } from 'fs';
import { file } from 'tempy';
import { Closure } from './Closure';
import { getCodeFromExecutionProgram } from './getCodeFromExecutionProgram';
import { getExecutionProgramForDefinition } from './getExecutionCodeForDefinition/getExecutionProgramForDefinition';
import { exec } from 'pkg';
import { callExpression, identifier, memberExpression } from '@babel/types';

export async function buildExecutable(
  closure: Closure,
  options: {
    target: 'host';
    output: string;
  }
) {
  const executeExpression = callExpression(closure.expression, [
    memberExpression(identifier('process'), identifier('argv')),
  ]);
  const program = await getExecutionProgramForDefinition(
    Closure({
      expression: executeExpression,
      references: closure.references,
    })
  );
  const code = await getCodeFromExecutionProgram(program);
  const tmpFile = file();

  writeFileSync(tmpFile, code);

  await exec([tmpFile, '--target', options.target, '--output', options.output]);
}
