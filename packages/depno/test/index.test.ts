import { directory } from 'tempy';
import { runFile } from '../src/index';
import { Chance } from 'chance';
import { join } from 'path';
import { statefulTest } from './statefulTest';
import { fixtureFile, fixtureFolder } from './fixtureFile';
import { staticFileServer } from './staticFileServer';
import { collectStreamChunks } from './collectStreamChunks';
import stripIndent from 'strip-indent';
import { assertThat } from './assertThat';
import { hasExitedSuccessfulyWith } from './assertions/hasExitedSuccessfulyWith';
import Expect from 'expect';
declare const expect: typeof Expect;
declare const describe;

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

      await assertThat(
        childProcess,
        hasExitedSuccessfulyWith(expectedStdout + '\n')
      );
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

    await assertThat(
      childProcess,
      hasExitedSuccessfulyWith(expectedStdout + '\n')
    );
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

    await assertThat(
      childProcess,
      hasExitedSuccessfulyWith(expectedStdout + '\n')
    );
  });

  statefulTest(
    'should run the given const exported function from a file',
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

      await assertThat(
        childProcess,
        hasExitedSuccessfulyWith(expectedStdout + '\n')
      );
    }
  );

  statefulTest(
    'should run the given exported function from a file',
    async function*() {
      const expectedStdout = chance.string();
      const exportedFunctionName = chance.string({ pool: 'abcdef' });

      const tmpFilePath = yield* fixtureFile(
        `
				import {console} from "console";
      	export function ${exportedFunctionName}() {
					const text: string = '${expectedStdout}';
					console.log(text);
				}
      `
      );

      const childProcess = await runFile(tmpFilePath, {
        exportedFunctionName,
        args: [],
      });

      await assertThat(
        childProcess,
        hasExitedSuccessfulyWith(expectedStdout + '\n')
      );
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

      await assertThat(
        childProcess,
        hasExitedSuccessfulyWith(expectedStdout + '\n')
      );
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

        await assertThat(
          childProcess,
          hasExitedSuccessfulyWith(expectedStdout + '\n')
        );
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

        await assertThat(
          childProcess,
          hasExitedSuccessfulyWith(expectedStdout + '\n')
        );
      }
    );

    statefulTest(
      'should run a file that imports default from a dependency',
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

        await assertThat(
          childProcess,
          hasExitedSuccessfulyWith(expectedStdout + '\n')
        );
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

          await assertThat(
            childProcess,
            hasExitedSuccessfulyWith(expectedStdout + '\n')
          );
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

          await assertThat(
            childProcess,
            hasExitedSuccessfulyWith(expectedStdout + '\n')
          );
        }
      );
    });
  });

  statefulTest('with a class extending another', async function*() {
    const expectedStdout = chance.string();

    const tmpFilePath = yield* fixtureFile(`
				import {console} from "console";

				class A {

				}

				class B extends A {
					get() {
						return '${expectedStdout}'
					}
				}

        export default () => {
          console.log(new B().get());
        }
      `);

    const childProcess = await runFile(tmpFilePath);

    await assertThat(
      childProcess,
      hasExitedSuccessfulyWith(expectedStdout + '\n')
    );
  });

  describe('declarations', () => {
    statefulTest(
      'should run a file with dependencies that have the same named declaration',
      async function*() {
        const tmpFolder = yield* fixtureFolder({
          ['foo.ts']: `
					const a = 1;
					export const b = a;
					`,
          ['baz.ts']: `
					const a = 2;
					export const c = a;
					`,
          ['bar.ts']: `
					import {console} from "console";
					import {c} from "./baz.ts";
					import {b} from "./foo.ts";

					export default () => {
						console.log(b);
						console.log(c);
					}
					`,
        });

        const childProcess = await runFile(join(tmpFolder, 'bar.ts'));

        await assertThat(childProcess, hasExitedSuccessfulyWith(`1\n2\n`));
      }
    );

    statefulTest(
      'should run a file with dependencies that both import from console',
      async function*() {
        const tmpFolder = yield* fixtureFolder({
          ['foo.ts']: `
					import { console } from "console";
					export function foo() {
						console.log("foo");
					}
					`,
          ['baz.ts']: `
					import { console } from "console";
					import { foo } from "./foo.ts";
					export default () => {
						foo();
						console.log('baz');
					}
					`,
        });

        const childProcess = await runFile(join(tmpFolder, 'baz.ts'));

        await assertThat(childProcess, hasExitedSuccessfulyWith(`foo\nbaz\n`));
      }
    );
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

        await assertThat(childProcess, hasExitedSuccessfulyWith(`true\n`));
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

      await assertThat(childProcess, hasExitedSuccessfulyWith(`true\n`));
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

        await assertThat(
          childProcess,
          hasExitedSuccessfulyWith(`true\ntrue\ntrue\n`)
        );
      }
    );
  });

  statefulTest(
    'should throw proper error on unhandled rejections',
    async function*() {
      const tmpFilePath = yield* fixtureFile(`
				import {console} from "console";
        export default async () => {
          throw new Error('this is my error')
        }
      `);

      const childProcess = await runFile(tmpFilePath);

      expect(childProcess.stdout).toBeDefined();
      let stdout = await collectStreamChunks(childProcess.stdout!);
      expect(stdout).toEqual('');

      expect(childProcess.stderr).toBeDefined();
      let stderr = await collectStreamChunks(childProcess.stderr!);
      expect(stderr).toEqual(
        expect.stringMatching(outputMatchRegExp`
          undefined:4
						throw new Error('this is my error');
									^

					Error: this is my error
							at eval (eval at <anonymous> (${anyString}:1:1), <anonymous>:4:9)
							at Object.<anonymous> (${anyString}:1:83)
							at Module._compile (internal/modules/cjs/loader.js:1151:30)
							at Object.Module._extensions..js (internal/modules/cjs/loader.js:1171:10)
							at Module.load (internal/modules/cjs/loader.js:1000:32)
							at Function.Module._load (internal/modules/cjs/loader.js:899:14)
							at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:71:12)
							at internal/main/run_main_module.js:17:47
					`)
      );
    }
  );
});

const anyString = '.*';

function outputMatchRegExp(strings: TemplateStringsArray, ...vars: any[]) {
  const regExpAsString = strings.reduce((result, current, index) => {
    return (
      result +
      escapeRegExp(current) +
      (index === strings.length - 1 ? '' : vars[index])
    );
  }, '');
  return new RegExp(
    stripIndent(regExpAsString.replace(/\t/g, '  ')).trim(),
    'img'
  );
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
