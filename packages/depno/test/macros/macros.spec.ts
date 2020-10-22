import { file } from 'tempy';
import { runFile } from '../../src';
import { hasExitedSuccessfulyWith } from '../assertions/hasExitedSuccessfulyWith';
import { assertThat } from '../assertThat';
import { fixtureFile } from '../fixtureFile';
import { statefulTest } from '../statefulTest';
declare const describe;

describe('runFile', () => {
  statefulTest.only(
    'should run a file with an inline macro',
    async function*() {
      const tmpFilePath = file({ extension: 'ts' });

      yield* fixtureFile(
        `
					import { createMacro } from '@depno/macros';
					import { console } from "console";

					const LocationBasedSymbol = createMacro(({definitions, definitionCanonicalName, node, types}) => {
						return {
							replacement: types.callExpression(types.identifier('Symbol'), [
								types.stringLiteral(
									definitionCanonicalName.uri + ':' + node.loc.start.line + ':' + node.loc.start.column
								),
							])
						};
					});

					export default () => {
						console.log(LocationBasedSymbol());
					};
				`,
        tmpFilePath
      );

      const childProcess = await runFile(tmpFilePath);

      await assertThat(
        childProcess,
        hasExitedSuccessfulyWith(`Symbol(${tmpFilePath}:16:18)\n`)
      );
    }
  );

  statefulTest.only(
    'should run a file with an inline macro that has ast dependencies',
    async function*() {
      const tmpFilePath = file({ extension: 'ts' });

      yield* fixtureFile(
        `
					import { createMacro } from '@depno/macros';
					import { console } from "console";

					function createSymbolCallExpression(types, value) {
						return types.callExpression(types.identifier('Symbol'), [
							types.stringLiteral(value),
						])
					}

					const LocationBasedSymbol = createMacro(({definitions, definitionCanonicalName, node, types}) => {
						return {
							replacement: createSymbolCallExpression(
								types,
								definitionCanonicalName.uri + ':' + node.loc.start.line + ':' + node.loc.start.column
							)
						};
					});

					export default () => {
						console.log(LocationBasedSymbol());
					};
				`,
        tmpFilePath
      );

      const childProcess = await runFile(tmpFilePath);

      await assertThat(
        childProcess,
        hasExitedSuccessfulyWith(`Symbol(${tmpFilePath}:21:18)\n`)
      );
    }
  );
});
