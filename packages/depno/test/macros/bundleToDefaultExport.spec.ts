import { statefulTest } from '../statefulTest';
import { file, directory } from 'tempy';
import { fixtureFile } from '../fixtureFile';
import { runFile } from '../../src';
import { collectStreamChunks } from '../collectStreamChunks';
import { join } from 'path';

describe('runFile', () => {
  describe('with bundleToDefaultExport', () => {
    statefulTest(
      'should print the result of bundling a path',
      async function*() {
        const tmpFilePath = file({ extension: 'ts' });

        yield* fixtureFile(
          `
						import { bundleToDefaultExport } from 'bundler';
						import { console } from "console";

						export function fibonacci(num: number): number {
							if (num <= 1) return 1;

							return fibonacci(num - 1) + fibonacci(num - 2);
						}

						export default () => {
							console.log(bundleToDefaultExport(fibonacci));
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
          "function fibonacci(num){if(num<=1)return 1;return fibonacci(num-1)+fibonacci(num-2);}export default fibonacci;
          "
        `);
      }
    );

    statefulTest('should bundle transitively', async function*() {
      const tmpFilePath = file({ extension: 'ts' });

      yield* fixtureFile(
        `
						import { bundleToDefaultExport } from 'bundler';
						import { console } from "console";

						const a = 1;
						const b = a;
						const c = b;

						export default () => {
							console.log(bundleToDefaultExport(c));
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
        "const a=1;const b=a;const c=b;export default c;
        "
      `);
    });

    statefulTest('should bundle with a dependency', async function*() {
      const tmpDirectory = directory();

      const dependantFilePath = yield* fixtureFile(
        `
				import { bundleToDefaultExport } from 'bundler';
				import { fibonacci } from "./dependency.ts";
				import { console } from "console";

				export default () => {
					console.log(bundleToDefaultExport(fibonacci));
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
        "function fibonacci(num){if(num<=1)return 1;return fibonacci(num-1)+fibonacci(num-2);}export default fibonacci;
        "
      `);
    });
  });
});
