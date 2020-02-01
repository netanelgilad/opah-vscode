import { file } from 'tempy';
import { Chance } from 'chance';
import { writeFileSync, unlinkSync } from 'fs';
import { spawn } from 'child_process';

it('should run a given function with given parameters from a typescript file', async () => {
  const tmpFilePath = file({ extension: 'ts' });
  const chance = new Chance();
  const expectedStdout = chance.string();
  const exportedFunctionName = chance.string({ pool: 'abcdef' });

  writeFileSync(
    tmpFilePath,
    `
      export const ${exportedFunctionName} = (text) => {
        console.log(text);
      }
    `
  );

  try {
    const childProcess = spawn('node', [
      './dist/index.js',
      tmpFilePath,
      exportedFunctionName,
      JSON.stringify(expectedStdout),
    ]);

    expect(childProcess.stdout).toBeDefined();

    let output = '';
    for await (const chunk of childProcess.stdout!) {
      output += chunk;
    }

    expect(output).toEqual(expectedStdout + '\n');

    let stderr = '';
    for await (const chunk of childProcess.stderr!) {
      stderr += chunk;
    }

    expect(stderr).toEqual('');
  } finally {
    unlinkSync(tmpFilePath);
  }
});
