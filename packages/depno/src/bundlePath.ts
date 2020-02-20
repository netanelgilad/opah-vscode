import { NodePath, Binding } from '@babel/traverse';
import { isChildScope } from './isChildScope';
import {
  program,
  Statement,
  expressionStatement,
  isStatement,
  Expression,
  Program,
} from '@babel/types';

export function bundlePath(
  pathToBundle: NodePath,
  programPath: NodePath<Program>
) {
  const outOfScopeBindings = new Set<Binding>();
  pathToBundle.traverse({
    // @ts-ignore
    ReferencedIdentifier(path: NodePath<Identifier>) {
      const binding = path.scope.getBinding(path.node.name);
      if (!binding) {
        throw path.buildCodeFrameError(
          `Could not find ${path.node.name}`,
          ReferenceError
        );
      } else {
        if (binding.scope === programPath.scope) {
          outOfScopeBindings.add(binding);
        } else {
          if (!isChildScope(binding.scope, pathToBundle.scope)) {
            throw path.buildCodeFrameError(
              `Cannot reference a non program declaration: ${path.node.name}`,
              ReferenceError
            );
          }
        }
      }
    },
  });

  return program(
    Array.from(outOfScopeBindings)
      .map(binding => binding.path.node as Statement)
      .concat([
        isStatement(pathToBundle.node)
          ? pathToBundle.node
          : expressionStatement(pathToBundle.node as Expression),
      ])
  );
}
