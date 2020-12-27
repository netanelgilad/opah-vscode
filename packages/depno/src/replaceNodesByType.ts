import traverse, { NodePath } from '@babel/traverse';
import {
  Expression,
  ExpressionStatement,
  expressionStatement,
  file,
  Node,
  program
} from '@babel/types';

export async function replaceNodesByType<T extends Node>(
  expression: Expression,
  type: T['type'],
  replacer: (node: T) => Promise<Node | undefined>
) {
  let tempProgram = program([expressionStatement(expression)]);

  const transformPromises: Promise<void>[] = [];

  traverse(file(tempProgram, undefined, undefined), {
    [type]: {
      exit(path: NodePath<T>) {
        transformPromises.push(
          (async () => {
            await Promise.all(transformPromises);
            const replacement = await replacer(path.node);
            if (replacement) {
              path.parentPath.replaceWith(replacement);
            }
          })()
        );
      },
    },
  });

  await Promise.all(transformPromises);

  return (tempProgram.body[0] as ExpressionStatement).expression;
}
