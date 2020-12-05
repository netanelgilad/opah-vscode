import { Identifier, isIdentifier, Node } from '@babel/types';
import { fields, variant } from 'variant';

const IdentifierExpectedError = variant(
  'IdentifierExpectedError',
  fields<{ actualNodeType: string }>()
);

export function assertIdentifier(node: Node): asserts node is Identifier {
  if (!isIdentifier(node)) {
    throw IdentifierExpectedError({ actualNodeType: node.type });
  }
}
