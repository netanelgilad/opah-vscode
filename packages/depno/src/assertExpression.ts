import { Node, Expression, isExpression } from '@babel/types';
import { variant, fields } from 'variant';

const ExpressionExpectedError = variant(
  'ExpressionExpectedError',
  fields<{ actualNodeType: string }>()
);

export function assertExpression(node: Node): asserts node is Expression {
  if (!isExpression(node)) {
    throw ExpressionExpectedError({ actualNodeType: node.type });
  }
}
