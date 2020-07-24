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
				import {console} from "console";
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

  statefulTest('should ignore types when bundling', async function*() {
    const expectedStdout = chance.string();

    const tmpFilePath = yield* fixtureFile(`
				import {console} from "console";

				type MyType = string;

        export default () => {
          const text: MyType = '${expectedStdout}';
          console.log(text);
        }
      `);

    const childProcess = await runFile(tmpFilePath);

    expect(childProcess.stdout).toBeDefined();
    let stdout = await collectStreamChunks(childProcess.stdout!);
    expect(stdout).toEqual(expectedStdout + '\n');
  });

  statefulTest('should run a relative typecript file', async function*() {
    const tmpDirectory = directory();
    const expectedStdout = chance.string();

    yield* fixtureFile(
      `
				import {console} from "console";
        export default () => {
          const text: string = '${expectedStdout}';
          console.log(text);
        }
      `,
      join(tmpDirectory, './fileToRun.ts')
    );

    const childProcess = await runFile('./fileToRun.ts', {
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
				import {console} from "console";
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
				import {console} from "console";
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
					import {console} from "console";
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

    statefulTest(
      'should ignore types when bundling a dependency',
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
					import {console} from "console";

					type MyType = string;

					export function foo() {
						console.log('${expectedStdout}' as MyType);
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

    statefulTest(
      'should run a file that imports deafult from a dependency',
      async function*() {
        const tmpDirectory = directory();
        const expectedStdout = chance.string();

        const dependantFilePath = yield* fixtureFile(
          `
        import foo from "./dependency.ts";

        export default () => {
          foo();
        }
      `,
          join(tmpDirectory, 'dependant.ts')
        );

        yield* fixtureFile(
          `
					import {console} from "console";
					export default function () {
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
						import {console} from "console";
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
							import {console} from "console";
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

  describe('builtin modules', () => {
    statefulTest(
      'should allow importing Buffer from buffer',
      async function*() {
        const tmpFilePath = yield* fixtureFile(`
				import {Buffer} from "buffer";
				import {console} from "console";
        export default () => {
          console.log(typeof Buffer !== "undefined")
        }
      `);

        const childProcess = await runFile(tmpFilePath);

        expect(childProcess.stdout).toBeDefined();
        let stdout = await collectStreamChunks(childProcess.stdout!);
        expect(stdout).toEqual('true\n');
      }
    );

    statefulTest('should allow importing from https moudle', async function*() {
      const tmpFilePath = yield* fixtureFile(`
				import {request} from "https";
				import {console} from "console";
        export default () => {
          console.log(typeof request !== "undefined")
        }
      `);

      const childProcess = await runFile(tmpFilePath);

      expect(childProcess.stdout).toBeDefined();
      let stdout = await collectStreamChunks(childProcess.stdout!);
      expect(stdout).toEqual('true\n');
    });

    statefulTest(
      'should allow importing from node buildin modules',
      async function*() {
        const tmpFilePath = yield* fixtureFile(`
					import {readFile} from "fs";
					import { Readable } from "stream";
					import { request } from "http";
					import { console } from "console";

					export default () => {
						console.log(typeof readFile !== "undefined")
						console.log(typeof Readable !== "undefined")
						console.log(typeof request !== "undefined")
					}
				`);

        const childProcess = await runFile(tmpFilePath);

        expect(childProcess.stderr).toBeDefined();
        let stderr = await collectStreamChunks(childProcess.stderr!);
        expect(stderr).toEqual('');

        expect(childProcess.stdout).toBeDefined();
        let stdout = await collectStreamChunks(childProcess.stdout!);
        expect(stdout).toEqual('true\ntrue\ntrue\n');
      }
    );
  });
});
