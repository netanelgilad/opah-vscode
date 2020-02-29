import {
  CallExpression,
  Node,
  Identifier,
} from 'https://unpkg.com/@babel/types@7.8.6/lib/index.d.ts';
import { NodePath } from 'https://unpkg.com/@types/babel__core@7.1.6/index.d.ts';

type TContext = {
  reference: NodePath<Identifier>;
  types: typeof import('@babel/types');
  state: any;
};

export function functionMacro(
  fn: (context: TContext, ...args: Node[]) => Node
) {
  return (context: TContext) => {
    const callExpression = context.reference.parentPath.node as CallExpression;
    const args = callExpression.arguments;
    const toReplace = fn(context, ...args);
    context.reference.parentPath.replaceWith(toReplace);
  };
}
