import { canonicalIdentifier } from './canonicalIdentifier';
import {
  Declaration,
  Expression,
  program,
  isExpression,
  expressionStatement,
  isDeclaration,
  file,
  identifier,
  ExpressionStatement,
  isIdentifier,
  cloneNode,
} from '@babel/types';
import traverse from '@babel/traverse';
import { CanonicalName } from './CanonicalName';
import { Map } from 'immutable';

export function replaceReferencesToCanonicalReferences(
  node: Declaration,
  references: Map<string, CanonicalName>,
  canonicalName?: CanonicalName
): Declaration;
export function replaceReferencesToCanonicalReferences(
  node: Expression,
  references: Map<string, CanonicalName>,
  canonicalName?: CanonicalName
): Expression;
export function replaceReferencesToCanonicalReferences(
  node: Declaration | Expression,
  references: Map<string, CanonicalName>,
  canonicalName?: CanonicalName
) {
  if (isIdentifier(node)) {
    return identifier(canonicalIdentifier(references.get(node.name)!));
  }

  const clonedNode = cloneNode(node);

  let tempProgram = program(
    isExpression(clonedNode)
      ? [expressionStatement(clonedNode)]
      : isDeclaration(clonedNode)
      ? [clonedNode]
      : []
  );

  traverse(file(tempProgram, undefined, undefined), {
    // @ts-ignore
    ReferencedIdentifier(path: NodePath<Identifier>) {
      if (references.has(path.node.name) && !path.scope.getBinding(path.node.name)) {
        path.replaceWith(
          identifier(canonicalIdentifier(references.get(path.node.name)!))
        );
      } else if (canonicalName && path.node.name === canonicalName.name) {
        path.replaceWith(identifier(canonicalIdentifier(canonicalName)));
      }
      path.skip();
    },
  });

  return isExpression(node)
    ? (tempProgram.body[0] as ExpressionStatement).expression
    : tempProgram.body[0];
}
