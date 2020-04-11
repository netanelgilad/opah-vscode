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

  statefulTest(
    'should run a file with an inline macro that has ast dependencies',
    async function*() {
      const tmpFilePath = file({ extension: 'ts' });

      yield* fixtureFile(
        `
      import { createMacro } from '@depno/macros';
      import { CallExpression, Node, Identifier } from "@babel/types";
      import { NodePath } from "@babel/core";
      
      type TContext = {
        reference: NodePath<Identifier>,
        types: typeof import("@babel/types"),
        state: any
      }
      
      function functionMacro(fn: (context: TContext, ...args: Node[]) => Node) {
        return (context) => {
          const callExpression = context.reference.parentPath.node as CallExpression;
          const args = callExpression.arguments;
          const toReplace = fn(context, ...args);
          context.reference.parentPath.replaceWith(toReplace);
        }
      }
      
      const LocationBasedSymbol = createMacro(functionMacro(({ reference, types, state }) => {
        return types.callExpression(types.identifier('Symbol'), [
          types.stringLiteral(
            state.file.opts.filename +
            ':' +
            reference.node.loc.start.line +
            ':' +
            reference.node.loc.start.column
          ),
        ])
      }));
      
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
      expect(stdout).toEqual(`Symbol(${tmpFilePath}:34:20)\n`);
    }
  );
});
