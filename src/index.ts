import { ChildProcess, spawn } from 'child_process';
import { transformFileAsync } from '@babel/core';
import { file } from 'tempy';
import { writeFileSync } from 'fs';

export async function runFile(path: string): Promise<ChildProcess> {
  const { code } = (await transformFileAsync(path, {
    presets: ['@babel/preset-typescript'],
  }))!;
  const tmpFilePath = file();
  writeFileSync(tmpFilePath, code);

  return spawn('node', [tmpFilePath]);
}
