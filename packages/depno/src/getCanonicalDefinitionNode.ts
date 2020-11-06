import {
  isVariableDeclarator,
  variableDeclaration,
  variableDeclarator,
  identifier,
  isFunctionDeclaration,
  functionDeclaration,
  isClassDeclaration,
  classDeclaration,
  isExportDefaultDeclaration,
  functionExpression,
  Expression,
} from '@babel/types';
import { unimplemented } from '@deaven/unimplemented';
import { ReferencedDefinitionNode, CaononicalDefinitionNode } from './Bundle';
import { CanonicalName, canonicalIdentifier } from './fullyQualifiedIdentifier';

export function getCanonicalDefinitionNode(
  canonicalName: CanonicalName,
  node: ReferencedDefinitionNode
): CaononicalDefinitionNode {
  if (isVariableDeclarator(node)) {
    return variableDeclaration('const', [
      variableDeclarator(
        identifier(canonicalIdentifier(canonicalName)),
        node.init
      ),
    ]);
  } else if (isFunctionDeclaration(node)) {
    return functionDeclaration(
      identifier(canonicalIdentifier(canonicalName)),
      node.params,
      node.body,
      node.generator,
      node.async
    );
  } else if (isClassDeclaration(node)) {
    return classDeclaration(
      identifier(canonicalIdentifier(canonicalName)),
      node.superClass,
      node.body,
      node.decorators
    );
  } else if (isExportDefaultDeclaration(node)) {
    return variableDeclaration('const', [
      variableDeclarator(
        identifier(canonicalIdentifier(canonicalName)),
        isFunctionDeclaration(node.declaration)
          ? functionExpression(
              node.declaration.id,
              node.declaration.params,
              node.declaration.body,
              node.declaration.generator,
              node.declaration.async
            )
          : (node.declaration as Expression)
      ),
    ]);
  } else {
    return unimplemented();
  }
}
