import { Program } from '@babel/types';
import { fork } from 'child_process';
import { writeFileSync } from 'fs';
import { file } from 'tempy';
import { getCodeFromExecutionProgram } from './getCodeFromExecutionProgram';

export function forkProgram(program: Program, cwd: string) {
  const code = getCodeFromExecutionProgram(program);

  const tmpFile = file({ extension: 'js' });

  writeFileSync(tmpFile, code);

  return fork(tmpFile, [], {
    cwd: cwd,
    execArgv: ['--unhandled-rejections=strict'],
  });
}
