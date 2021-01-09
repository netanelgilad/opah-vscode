import { Program } from '@babel/types';
import { getCodeFromExecutionProgram } from './getCodeFromExecutionProgram';

export function executeProgram(program: Program) {
  const code = getCodeFromExecutionProgram(program);
  return eval(code!);
}
