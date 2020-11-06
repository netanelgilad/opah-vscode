import { NodePath } from '@babel/core';
import {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportSpecifier,
  isExportDefaultDeclaration,
  isImportDefaultSpecifier,
  isImportSpecifier,
  Node,
} from '@babel/types';
import { unimplemented } from '@deaven/unimplemented';
import { CanonicalName } from './fullyQualifiedIdentifier';
import { isReferencedDefinitionNode } from './isReferencedDefinitionNode';
import { resolveURIFromDependency } from './resolveURIFromDependency';

export function getCanonicalNameFromPath(
  path: NodePath,
  uri: string
): CanonicalName {
  if (isPartOfImportStatement(path.node)) {
    const importSource = (path.parentPath as NodePath<ImportDeclaration>).node
      .source.value;
    const dependencyURI = resolveURIFromDependency(importSource, uri);
    return {
      uri: dependencyURI,
      name: getImportedFromSpecifier(path.node),
    };
  } else if (isReferencedDefinitionNode(path.node)) {
    return {
      uri: uri,
      name: isExportDefaultDeclaration(path.node)
        ? 'default'
        : path.node.id.name,
    };
  } else {
    return unimplemented();
  }
}

function isPartOfImportStatement(
  node: Node
): node is ImportSpecifier | ImportDefaultSpecifier {
  return isImportSpecifier(node) || isImportDefaultSpecifier(node);
}

function getImportedFromSpecifier(
  node: ImportSpecifier | ImportDefaultSpecifier
) {
  if (isImportSpecifier(node)) {
    return node.imported.name as string;
  } else {
    return 'default';
  }
}
