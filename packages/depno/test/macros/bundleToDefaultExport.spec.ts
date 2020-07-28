import { statefulTest } from '../statefulTest';
import { file, directory } from 'tempy';
import { fixtureFile } from '../fixtureFile';
import { runFile } from '../../src';
import { collectStreamChunks } from '../collectStreamChunks';
import { join } from 'path';
import { fullyQualifiedIdentifier } from '../../src/fullyQualifiedIdentifier';

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
          "function ${fullyQualifiedIdentifier(
            tmpFilePath,
            'fibonacci'
          )}(num){if(num<=1)return 1;return ${fullyQualifiedIdentifier(
          tmpFilePath,
          'fibonacci'
        )}(num-1)+${fullyQualifiedIdentifier(
          tmpFilePath,
          'fibonacci'
        )}(num-2);}export default ${fullyQualifiedIdentifier(
          tmpFilePath,
          'fibonacci'
        )};
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
        "const ${fullyQualifiedIdentifier(
          tmpFilePath,
          'a'
        )}=1;const ${fullyQualifiedIdentifier(tmpFilePath, 'b')}=${fullyQualifiedIdentifier(tmpFilePath, 'a')};const ${fullyQualifiedIdentifier(tmpFilePath, 'c')}=${fullyQualifiedIdentifier(tmpFilePath, 'b')};export default ${fullyQualifiedIdentifier(tmpFilePath, 'c')};
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

      const dependencyFilePath = yield* fixtureFile(
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
        "function ${fullyQualifiedIdentifier(
          dependencyFilePath,
          'fibonacci'
        )}(num){if(num<=1)return 1;return ${fullyQualifiedIdentifier(dependencyFilePath, 'fibonacci')}(num-1)+${fullyQualifiedIdentifier(dependencyFilePath, 'fibonacci')}(num-2);}export default ${fullyQualifiedIdentifier(dependencyFilePath, 'fibonacci')};
        "
      `);
    });
  });
});
