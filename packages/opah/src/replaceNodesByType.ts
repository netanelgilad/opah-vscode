import traverse, { NodePath } from '@babel/traverse';
import {
  Declaration,
  file,
  Node,
  program
} from '@babel/types';

export async function replaceNodesByType<T extends Node>(
  node: Declaration,
  type: T['type'],
  replacer: (node: T) => Promise<Node | undefined>
) {
  let tempProgram = program([
    node
  ]);

  const transformPromises: Promise<void>[] = [];

  traverse(file(tempProgram, undefined, undefined), {
    [type]: {
      exit(path: NodePath<T>) {
        transformPromises.push(
          (async () => {
            await Promise.all(transformPromises);
            const replacement = await replacer(path.node);
            if (replacement) {
              path.replaceWith(replacement);
            }
          })()
        );
      },
    },
  });

  await Promise.all(transformPromises);

  return tempProgram.body[0] as Declaration;
}
