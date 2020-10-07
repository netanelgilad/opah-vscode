import { NodePath } from '@babel/core';
import { Identifier, stringLiteral } from '@babel/types';
import { getDefinitionNameFromNode } from '../getDefinitionNameFromNode';

export function canonicalName(path: NodePath<Identifier>) {
  const arg = path.parentPath.get('arguments.0') as NodePath;
  path.parentPath.replaceWith(
    stringLiteral(getDefinitionNameFromNode(arg.node))
  );
}
