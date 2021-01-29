import { Program } from '@babel/types';
import { getCodeFromExecutionProgram } from './getCodeFromExecutionProgram';

export function executeProgram(program: Program) {
  const requireResolve = require.resolve;
  const code = getCodeFromExecutionProgram(program, process.env.DO_IT ? {
    "@opah/core": requireResolve('./core'),
    "@opah/host": requireResolve('./host'),
    "@opah/immutable": requireResolve('./immutable'),
  } : undefined);
  return eval(code!);
}
