import { statefulTest } from '../statefulTest';
import { fixtureFile } from '../fixtureFile';
import { runFile } from '../../src';
import { collectStreamChunks } from '../collectStreamChunks';
import { file } from 'tempy';

describe('runFile', () => {
  statefulTest('should run a file with an inline macro', async function*() {
    const tmpFilePath = file();

    yield* fixtureFile(
      `
        import { createMacro } from '@depno/macros';

        const LocationBasedSymbol = createMacro(({ reference, types, state }) => {
          reference.parentPath.replaceWith(
            types.callExpression(types.identifier('Symbol'), [
              types.stringLiteral(
                state.file.opts.filename +
                  ':' +
                  reference.node.loc.start.line +
                  ':' +
                  reference.node.loc.start.column
              ),
            ])
          );
        });

        export default () => {
          console.log(LocationBasedSymbol());
        };
    `,
      tmpFilePath
    );

    const childProcess = await runFile(tmpFilePath);

    let stderr = await collectStreamChunks(childProcess.stderr!);
    expect(stderr).toEqual('');

    expect(childProcess.stdout).toBeDefined();
    let stdout = await collectStreamChunks(childProcess.stdout!);
    expect(stdout).toEqual(`Symbol(${tmpFilePath}:19:22)\n`);
  });
});
