import traverse from '@babel/traverse';
import {
  expressionStatement,
  file,
  isDeclaration,
  isExpression,
  isIdentifier,
  Node,
  program,
} from '@babel/types';
import { Set } from 'immutable';
import { LocalName } from './LocalName';

export function getOutOfScopeReferences(node: Node) {
  if (isIdentifier(node)) {
    return Set<LocalName>([node.name]);
  }
  return Set<LocalName>().withMutations(references => {
    traverse(
      file(
        program(
          isExpression(node)
            ? [expressionStatement(node)]
            : isDeclaration(node)
            ? [node]
            : []
        ),
        undefined,
        undefined
      ),
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
