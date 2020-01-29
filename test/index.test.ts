import { file } from 'tempy';
import { writeFileSync, unlinkSync } from 'fs';
import { runFile } from '../src/index';
import { Chance } from 'chance';

describe('runFile', () => {
  it('should run a typecript file', async () => {
    const tmpFilePath = file({ extension: 'ts' });
    const chance = new Chance();
    const expectedStdout = `Hello world ${chance.string()}`;

    writeFileSync(
      tmpFilePath,
      `
      const text: string = '${expectedStdout}';
      console.log(text);
    `
    );

    try {
      const childProcess = await runFile(tmpFilePath);

      expect(childProcess.stdout).toBeDefined();

      let output = '';
      for await (const chunk of childProcess.stdout!) {
        output += chunk;
      }

      expect(output).toEqual(expectedStdout + '\n');
    } finally {
      unlinkSync(tmpFilePath);
    }
  });
});
