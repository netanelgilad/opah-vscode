import {
  Node,
  isVariableDeclarator,
  Identifier,
  isFunctionDeclaration,
  isIdentifier,
  isClassDeclaration,
  isVariableDeclaration,
  isExportDefaultDeclaration,
} from '@babel/types';

export function getDefinitionNameFromNode(node: Node) {
  if (isVariableDeclarator(node)) {
    return (node.id as Identifier).name;
  } else if (isExportDefaultDeclaration(node)) {
    return 'default';
  } else if (isFunctionDeclaration(node)) {
    return node.id!.name;
  } else if (isVariableDeclaration(node)) {
    return (node.declarations[0].id as Identifier).name;
  } else if (isIdentifier(node)) {
    return node.name;
  } else if (isClassDeclaration(node)) {
    return node.id.name;
  }
  throw new Error(
    `Don't know how to getDefinitionNameFromNode for node of type ${node.type}`
  );
}
