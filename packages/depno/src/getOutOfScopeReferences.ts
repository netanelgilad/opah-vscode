import traverse from '@babel/traverse';
import {
  Expression,
  file,
  program,
  expressionStatement,
  isIdentifier,
} from '@babel/types';
import { Set } from 'immutable';
import { LocalName } from './LocalName';

export function getOutOfScopeReferences(expression: Expression) {
  if (isIdentifier(expression)) {
    return Set<LocalName>([expression.name]);
  }
  return Set<LocalName>().withMutations(references => {
    traverse(
      file(program([expressionStatement(expression)]), undefined, undefined),
      {
        // @ts-ignore
        ReferencedIdentifier(referencePath: NodePath<Identifier>) {
          if (
            !references.has(referencePath.node.name) &&
            !referencePath.scope.getBinding(referencePath.node.name)
          ) {
            references.add(referencePath.node.name);
          }
        },
      }
    );
  });
}
