import { NodePath } from '@babel/core';
import { Binding } from '@babel/traverse';
import { Identifier, Program } from '@babel/types';
import { globals } from './globals';
import { isChildScope } from './isChildScope';

export function validateBinding(
  binding: Binding | undefined,
  path: NodePath<Identifier>,
  programPath: NodePath<Program>,
  pathToBundle: NodePath
) {
  if (!binding) {
    if (!globals.includes(path.node.name)) {
      // TODO: find a way to use buildCodeFrameError
      throw new ReferenceError(`Could not find ${path.node.name}`);
    } else {
      return false;
    }
  } else {
    if (binding.scope === programPath.scope) {
      return true;
    } else {
      if (!isChildScope(binding.scope, pathToBundle.scope)) {
        throw path.buildCodeFrameError(
          `Cannot reference a non program declaration: ${path.node.name}`,
          ReferenceError
        );
      }
      return false;
    }
  }
}
