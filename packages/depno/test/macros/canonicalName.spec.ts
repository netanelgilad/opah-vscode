import { runFile } from '../../src';
import { fullyQualifiedIdentifier } from '../../src/fullyQualifiedIdentifier';
import { hasExitedSuccessfulyWith } from '../assertions/hasExitedSuccessfulyWith';
import { assertThat } from '../assertThat';
import { fixtureFile } from '../fixtureFile';
import { statefulTest } from '../statefulTest';
declare const describe;

describe('runFile', () => {
  describe('with canonicalName', () => {
    statefulTest(
      'should print the result of bundling a path',
      async function*() {
        const tmpFilePath = yield* fixtureFile(`
				import {console} from "console";
				import {createMacro} from "@depno/macros";

				export function fibonacci(num: number): number {
					if (num <= 1) return 1;

					return fibonacci(num - 1) + fibonacci(num - 2);
				}

				const canonicalName = createMacro(({definitions, definitionCanonicalName, node, types}) => {
					return {
						replacement: types.stringLiteral(node.arguments[0].name)
					}
				})

        export default () => {
          console.log(canonicalName(fibonacci));
        }
      `);

        const childProcess = await runFile(tmpFilePath);

        await assertThat(
          childProcess,
          hasExitedSuccessfulyWith(
            fullyQualifiedIdentifier(tmpFilePath, 'fibonacci') + '\n'
          )
        );
      }
    );
  });
});
