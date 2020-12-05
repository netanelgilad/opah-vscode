import {
  Node,
  isVariableDeclarator,
  isFunctionDeclaration,
  isClassDeclaration,
  isExportDefaultDeclaration,
} from '@babel/types';
import { ReferencedDefinitionNode } from './ReferencedDefinitionNode';

export function isReferencedDefinitionNode(
  node: Node
): node is ReferencedDefinitionNode {
  return (
    isVariableDeclarator(node) ||
    isFunctionDeclaration(node) ||
    isClassDeclaration(node) ||
    isExportDefaultDeclaration(node)
  );
}
