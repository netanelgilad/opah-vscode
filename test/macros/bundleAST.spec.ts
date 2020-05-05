import { statefulTest } from '../statefulTest';
import { file, directory } from 'tempy';
import { fixtureFile } from '../fixtureFile';
import { runFile } from '../../src';
import { collectStreamChunks } from '../collectStreamChunks';
import { join } from 'path';

describe('runFile', () => {
  describe('with bundlePath', () => {
    statefulTest(
      'should print the result of bundling a path',
      async function*() {
        const tmpFilePath = file({ extension: 'ts' });

        yield* fixtureFile(
          `
						import { bundleAST } from 'bundler';
						import { console } from "console";

						export function fibonacci(num: number): number {
							if (num <= 1) return 1;

							return fibonacci(num - 1) + fibonacci(num - 2);
						}

						export default () => {
							console.log(bundleAST(fibonacci));
						};
				`,
          tmpFilePath
        );

        const childProcess = await runFile(tmpFilePath);

        let stderr = await collectStreamChunks(childProcess.stderr!);
        expect(stderr).toEqual('');

        expect(childProcess.stdout).toBeDefined();
        let stdout = await collectStreamChunks(childProcess.stdout!);
        expect(stdout).toMatchInlineSnapshot(`
          "function fibonacci(num){if(num<=1)return 1;return fibonacci(num-1)+fibonacci(num-2);}fibonacci;
          "
        `);
      }
    );
  });

  statefulTest('should bundle with a dependency', async function*() {
    const tmpDirectory = directory();

    const dependantFilePath = yield* fixtureFile(
      `
			import { bundleAST } from 'bundler';
			import { fibonacci } from "./dependency.ts";
			import { console } from "console";

			export default () => {
				console.log(bundleAST(fibonacci));
			};
      `,
      join(tmpDirectory, 'dependant.ts')
    );

    yield* fixtureFile(
      `
			export function fibonacci(num: number): number {
				if (num <= 1) return 1;

				return fibonacci(num - 1) + fibonacci(num - 2);
			}
      `,
      join(tmpDirectory, 'dependency.ts')
    );

    const childProcess = await runFile(dependantFilePath);

    let stderr = await collectStreamChunks(childProcess.stderr!);
    expect(stderr).toEqual('');

    expect(childProcess.stdout).toBeDefined();
    let stdout = await collectStreamChunks(childProcess.stdout!);
    expect(stdout).toMatchInlineSnapshot(`
      "function fibonacci(num){if(num<=1)return 1;return fibonacci(num-1)+fibonacci(num-2);}fibonacci;
      "
    `);
  });
});
