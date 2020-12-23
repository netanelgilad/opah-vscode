import {
  isClassDeclaration,
  isExportDefaultDeclaration, isFunctionDeclaration, isVariableDeclarator, Node
} from '@babel/types';
import { ReferencedDefinitionNode } from './getExecutionCodeForDefinition/ReferencedDefinitionNode';

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
