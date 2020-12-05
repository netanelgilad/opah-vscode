import { directory } from 'tempy';
import { executeCanonicalName } from './executeCanonicalName';
import { Chance } from 'chance';
import { join } from 'path';
import { statefulTest } from '../../test/statefulTest';
import { fixtureFile, fixtureFolder } from '../../test/fixtureFile';
import { staticFileServer } from '../../test/staticFileServer';
import { collectStreamChunks } from '../../test/collectStreamChunks';
import stripIndent from 'strip-indent';
import { assertThat } from '../../test/assertThat';
import { hasExitedSuccessfulyWith } from '../../test/assertions/hasExitedSuccessfulyWith';
import { CanonicalName } from '../CanonicalName';

const chance = new Chance();

describe('executeCanonicalName', () => {
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

    const childProcess = await executeCanonicalName(
      CanonicalName({ uri: tmpFilePath, name: 'default' })
    );

    await assertThat(
      childProcess,
      hasExitedSuccessfulyWith(expectedStdout + '\n')
    );
  });

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

      const childProcess = await executeCanonicalName(
        CanonicalName({ uri: tmpFilePath, name: exportedFunctionName })
      );

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

      const childProcess = await executeCanonicalName(
        CanonicalName({ uri: tmpFilePath, name: exportedFunctionName }),
        [expectedStdout],
        {
          silent: true,
        }
      );

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

        const childProcess = await executeCanonicalName(
          CanonicalName({ uri: dependantFilePath, name: 'default' })
        );

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

        const childProcess = await executeCanonicalName(
          CanonicalName({ uri: dependantFilePath, name: 'default' })
        );

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

        const childProcess = await executeCanonicalName(
          CanonicalName({ uri: dependantFilePath, name: 'default' })
        );

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

          const childProcess = await executeCanonicalName(
            CanonicalName({ uri: tmpFilePath, name: 'default' })
          );

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

          const childProcess = await executeCanonicalName(
            CanonicalName({
              uri: `http://localhost:${
                (httpServerAddress! as any).port
              }/index.ts`,
              name: 'default',
            })
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

    const childProcess = await executeCanonicalName(
      CanonicalName({ uri: tmpFilePath, name: 'default' })
    );

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

        const childProcess = await executeCanonicalName(
          CanonicalName({ uri: join(tmpFolder, 'bar.ts'), name: 'default' })
        );

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

        const childProcess = await executeCanonicalName(
          CanonicalName({ uri: join(tmpFolder, 'baz.ts'), name: 'default' })
        );

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

        const childProcess = await executeCanonicalName(
          CanonicalName({ uri: tmpFilePath, name: 'default' })
        );

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

      const childProcess = await executeCanonicalName(
        CanonicalName({ uri: tmpFilePath, name: 'default' })
      );

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

        const childProcess = await executeCanonicalName(
          CanonicalName({ uri: tmpFilePath, name: 'default' })
        );

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

      const childProcess = await executeCanonicalName(
        CanonicalName({ uri: tmpFilePath, name: 'default' })
      );

      expect(childProcess.stdout).toBeDefined();
      let stdout = await collectStreamChunks(childProcess.stdout!);
      expect(stdout).toEqual('');

      expect(childProcess.stderr).toBeDefined();
      let stderr = await collectStreamChunks(childProcess.stderr!);
      expect(stderr).toEqual(
        expect.stringMatching(outputMatchRegExp`
          ${anyString}:2
						throw new Error('this is my error');
									^

					Error: this is my error
							at ${anyString}:2:9
							at ${anyString}:5:10`)
      );
    }
  );

  statefulTest(`should execute async macros in order`, async function*() {
    const tmpFilePath = yield* fixtureFile(
      `
				import {console} from "console";
				import {createMacro, Definition} from "@depno/core";
				import {Map} from "@depno/immutable";

				const firstMacro = createMacro(async () => {
					return Definition({
						expression: {
							type: 'NumericLiteral',
							value: 1
						},
						references: Map()
					})
				})

				const secondMacro = createMacro(async (nodeDefinition) => {
					return Definition({
						expression: {
							type: 'BinaryExpression',
							operator: '+',
							left: {
								type: 'NumericLiteral',
								value: 2
							},
							right: nodeDefinition.expression
						},
						references: Map()
					})
				})

      	export default function() {
					console.log(secondMacro(firstMacro()));
				}
      `
    );

    const childProcess = await executeCanonicalName(
      CanonicalName({ uri: tmpFilePath, name: 'default' })
    );

    await assertThat(childProcess, hasExitedSuccessfulyWith('3\n'));
  });
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
