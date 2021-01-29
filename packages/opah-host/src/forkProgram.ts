import { Program } from '@babel/types';
import { fork } from 'child_process';
import { writeFileSync } from 'fs';
import { file } from 'tempy';
import { getCodeFromExecutionProgram } from './getCodeFromExecutionProgram';

export function forkProgram(program: Program, cwd: string, silent = false) {
  const requireResolve = require.resolve;
  const code = getCodeFromExecutionProgram(program, process.env.DO_IT ? {
    "@opah/core": requireResolve('./core'),
    "@opah/host": requireResolve('./host'),
    "@opah/immutable": requireResolve('./immutable'),
  } : undefined);

  const tmpFile = file({ extension: 'js' });

  writeFileSync(tmpFile, code);

  return fork(tmpFile, [], {
    cwd: cwd,
    silent,
  });
}
