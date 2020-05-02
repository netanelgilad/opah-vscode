import { statefulTest } from '../statefulTest';
import { file } from 'tempy';
import { fixtureFile } from '../fixtureFile';
import { runFile } from '../../src';
import { collectStreamChunks } from '../collectStreamChunks';

describe('runFile', () => {
  describe('with bundlePath', () => {
    statefulTest(
      'should print the result of bundling a path',
      async function*() {
        const tmpFilePath = file({ extension: 'ts' });

        yield* fixtureFile(
          `
						import { bundleAST } from 'bundler';

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
          "function fibonacci(num: number): number {
            if (num <= 1) return 1;
            return fibonacci(num - 1) + fibonacci(num - 2);
          }

          fibonacci;
          "
        `);
      }
    );
  });
});
