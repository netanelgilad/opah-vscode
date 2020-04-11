import { directory } from 'tempy';
import { runFile } from '../src/index';
import { Chance } from 'chance';
import { join } from 'path';
import { statefulTest } from './statefulTest';
import { fixtureFile } from './fixtureFile';
import { staticFileServer } from './staticFileServer';
import { collectStreamChunks } from './collectStreamChunks';

const chance = new Chance();

describe('runFile', () => {
  statefulTest(
    'should run the default export from a typecript file',
    async function*() {
      const expectedStdout = chance.string();

      const tmpFilePath = yield* fixtureFile(`
        export default () => {
          const text: string = '${expectedStdout}';
          console.log(text);
        }
      `);

      const childProcess = await runFile(tmpFilePath);

      expect(childProcess.stdout).toBeDefined();
      let stdout = await collectStreamChunks(childProcess.stdout!);
      expect(stdout).toEqual(expectedStdout + '\n');
    }
  );

  statefulTest('should run a relative typecript file', async function*() {
    const tmpDirectory = directory();
    const expectedStdout = chance.string();

    const tmpFilePath = yield* fixtureFile(
      `
        export default () => {
          const text: string = '${expectedStdout}';
          console.log(text);
        }
      `,
      join(tmpDirectory, './fileToRun.ts')
    );

    const childProcess = await runFile(tmpFilePath, {
      cwd: tmpDirectory,
    });

    expect(childProcess.stdout).toBeDefined();
    let stdout = await collectStreamChunks(childProcess.stdout!);
    expect(stdout).toEqual(expectedStdout + '\n');
  });

  statefulTest(
    'should run the given exported function from a file',
    async function*() {
      const expectedStdout = chance.string();
      const exportedFunctionName = chance.string({ pool: 'abcdef' });

      const tmpFilePath = yield* fixtureFile(
        `
      export const ${exportedFunctionName} = () => {
        const text: string = '${expectedStdout}';
        console.log(text);
      }
      `
      );

      const childProcess = await runFile(tmpFilePath, {
        exportedFunctionName,
        args: [],
      });

      expect(childProcess.stdout).toBeDefined();
      let stdout = await collectStreamChunks(childProcess.stdout!);
      expect(stdout).toEqual(expectedStdout + '\n');
    }
  );

  statefulTest(
    'should run the given exported function with the given parameteres from a file',
    async function*() {
      const expectedStdout = chance.string();
      const exportedFunctionName = chance.string({ pool: 'abcdef' });

      const tmpFilePath = yield* fixtureFile(
        `
      export const ${exportedFunctionName} = (text) => {
        console.log(text);
      }
    `
      );

      const childProcess = await runFile(tmpFilePath, {
        exportedFunctionName,
        args: [expectedStdout],
      });

      expect(childProcess.stdout).toBeDefined();
      let stdout = await collectStreamChunks(childProcess.stdout!);
      expect(stdout).toEqual(expectedStdout + '\n');
    }
  );

  describe('with dependencies', () => {
    statefulTest(
      'should run the default export from a file with a single dependency',
      async function*() {
        const tmpDirectory = directory();
        const expectedStdout = chance.string();

        const dependantFilePath = yield* fixtureFile(
          `
        import {foo} from "./dependency.ts";

        export default () => {
          foo();
        }
      `,
          join(tmpDirectory, 'dependant.ts')
        );

        yield* fixtureFile(
          `
        export function foo() {
          console.log('${expectedStdout}');
        }
      `,
          join(tmpDirectory, 'dependency.ts')
        );

        const childProcess = await runFile(dependantFilePath);

        expect(childProcess.stdout).toBeDefined();
        let stdout = await collectStreamChunks(childProcess.stdout!);
        expect(stdout).toEqual(expectedStdout + '\n');
      }
    );

    describe('using http(/s) protocol', () => {
      statefulTest(
        'should run a file with an http dependency',
        async function*() {
          const expectedStdout = chance.string();

          const httpServerAddress = yield* staticFileServer({
            '/': `
            export function foo() {
              console.log('${expectedStdout}');
            }
          `,
          });

          const tmpFilePath = yield* fixtureFile(
            `
          import {foo} from "http://localhost:${
            (httpServerAddress! as any).port
          }";

          export default () => {
            foo();
          }
        `
          );

          const childProcess = await runFile(tmpFilePath);

          expect(childProcess.stdout).toBeDefined();
          let stdout = await collectStreamChunks(childProcess.stdout!);
          expect(stdout).toEqual(expectedStdout + '\n');
        }
      );

      statefulTest(
        'should run an http file with a relative dependency',
        async function*() {
          const expectedStdout = chance.string();

          const httpServerAddress = yield* staticFileServer({
            '/index.ts': `
              import {foo} from "./dependency.ts";

              export default () => {
                foo();
              }
            `,
            '/dependency.ts': `
              export function foo() {
                console.log('${expectedStdout}');
              }
            `,
          });

          const childProcess = await runFile(
            `http://localhost:${(httpServerAddress! as any).port}/index.ts`
          );

          let stderr = await collectStreamChunks(childProcess.stderr!);
          expect(stderr).toEqual('');

          expect(childProcess.stdout).toBeDefined();
          let stdout = await collectStreamChunks(childProcess.stdout!);
          expect(stdout).toEqual(expectedStdout + '\n');
        }
      );
    });
  });
});
