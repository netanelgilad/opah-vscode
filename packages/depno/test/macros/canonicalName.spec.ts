import { inspect } from 'util';
import { runFile } from '../../src';
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
				import { canonicalIdentifier } from "@depno/core";

				export function fibonacci(num: number): number {
					if (num <= 1) return 1;

					return fibonacci(num - 1) + fibonacci(num - 2);
				}

				const canonicalName = createMacro(({definitions, definitionCanonicalName, referencesInDefinitions, node, types}) => {
					const referencedCanonicalName = referencesInDefinitions
						.get(canonicalIdentifier(definitionCanonicalName))
						.get(node.arguments[0].name)

					return {
						replacement: types.objectExpression([
							types.objectProperty(types.identifier("uri"), types.stringLiteral(referencedCanonicalName.uri)),
							types.objectProperty(types.identifier("name"), types.stringLiteral(referencedCanonicalName.name))
						])
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
            inspect({ uri: tmpFilePath, name: 'fibonacci' }, null, 2) + '\n'
          )
        );
      }
    );
  });
});
