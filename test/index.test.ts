import { file, directory } from 'tempy';
import { writeFileSync, unlinkSync } from 'fs';
import { runFile } from '../src/index';
import { Chance } from 'chance';
import { join } from 'path';
import { createServer } from 'http';

describe('runFile', () => {
  it('should run a typecript file', async () => {
    const tmpFilePath = file({ extension: 'ts' });
    const chance = new Chance();
    const expectedStdout = chance.string();

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

  describe('with dependencies', () => {
    it('should run a file with a single dependency', async () => {
      const tmpDirectory = directory();
      const dependantFilePath = join(tmpDirectory, 'dependant.ts');
      const dependencyFilePath = join(tmpDirectory, 'dependency.ts');
      const chance = new Chance();
      const expectedStdout = chance.string();

      writeFileSync(
        dependantFilePath,
        `
        import {foo} from "./dependency.ts";
        foo();
      `
      );

      writeFileSync(
        dependencyFilePath,
        `
        export function foo() {
          console.log('${expectedStdout}');
        }
      `
      );

      try {
        const childProcess = await runFile(dependantFilePath);

        expect(childProcess.stdout).toBeDefined();

        let output = '';
        for await (const chunk of childProcess.stdout!) {
          output += chunk;
        }

        expect(output).toEqual(expectedStdout + '\n');
      } finally {
        unlinkSync(dependantFilePath);
        unlinkSync(dependencyFilePath);
      }
    });

    describe('using http(/s) protocol', () => {
      it('should run a file with an http dependency', async () => {
        const chance = new Chance();
        const expectedStdout = chance.string();
        const httpServer = createServer((_req, res) => {
          res.write(`
            export function foo() {
              console.log('${expectedStdout}');
            }
          `);
          res.end();
        });

        await new Promise(resolve => {
          httpServer.listen(resolve);
        });

        const tmpFilePath = file({ extension: 'ts' });

        writeFileSync(
          tmpFilePath,
          `
          import {foo} from "http://localhost:${
            (httpServer.address()! as any).port
          }";

          export default () => {
            foo();
          }
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
          httpServer.close();
          unlinkSync(tmpFilePath);
        }
      });
    });
  });
});
