import {
  Declaration,
  identifier,
  isClassDeclaration,
  isExportDefaultDeclaration,
  isExpression,
  isFunctionDeclaration,
  isVariableDeclarator,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { ReferencedDefinitionNode } from './ReferencedDefinitionNode';

class NodeWithoutInitError extends Error {}

export function getDeclarationFromReferencedDefinitionNode(
  node: ReferencedDefinitionNode
): Declaration {
  if (isVariableDeclarator(node)) {
    if (!node.init) {
      throw new NodeWithoutInitError();
    }
    return variableDeclaration('const', [node]);
  } else if (isFunctionDeclaration(node)) {
    return node;
  } else if (isClassDeclaration(node)) {
    return node;
  } else if (isExportDefaultDeclaration(node)) {
    if (isExpression(node.declaration)) {
      return variableDeclaration('const', [
        variableDeclarator(identifier('default'), node.declaration),
      ]);
    }

    return node.declaration;
  }
  return node;
}
