import { file } from 'tempy';
import { Chance } from 'chance';
import { writeFileSync, unlinkSync } from 'fs';
import { fork } from 'child_process';

it('should run a given function with given parameters from a typescript file', async () => {
  const tmpFilePath = file({ extension: 'ts' });
  const chance = new Chance();
  const expectedStdout = chance.string();
  const exportedFunctionName = chance.string({ pool: 'abcdef' });

  writeFileSync(
    tmpFilePath,
    `
		 import {console} from "console";
      export const ${exportedFunctionName} = (text) => {
        console.log(text);
      }
    `
  );

  try {
    const childProcess = fork(
      require.resolve('.bin/ts-node'),
      [
        require.resolve('./bin.ts'),
        tmpFilePath,
        exportedFunctionName,
        JSON.stringify(expectedStdout),
      ],
      {
        stdio: 'pipe',
      }
    );

    let stderr = '';
    for await (const chunk of childProcess.stderr!) {
      stderr += chunk;
    }

    expect(stderr).toEqual('');

    expect(childProcess.stdout).toBeTruthy();

    let output = '';
    for await (const chunk of childProcess.stdout!) {
      output += chunk;
    }

    expect(output).toEqual(expectedStdout + '\n');
  } finally {
    unlinkSync(tmpFilePath);
  }
}, 20000);
