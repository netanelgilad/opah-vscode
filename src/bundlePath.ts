import { NodePath, Binding } from '@babel/traverse';
import { isChildScope } from './isChildScope';
import {
  program,
  Statement,
  expressionStatement,
  isStatement,
  Expression,
  Program,
  isImportNamespaceSpecifier,
  ImportDeclaration,
  isVariableDeclarator,
  variableDeclaration,
  isIdentifier,
  Identifier,
} from '@babel/types';

function validateBinding(
  binding: Binding | undefined,
  path: NodePath<Identifier>,
  programPath: NodePath<Program>,
  pathToBundle: NodePath
) {
  if (!binding) {
    throw path.buildCodeFrameError(
      `Could not find ${path.node.name}`,
      ReferenceError
    );
  } else {
    if (binding.scope === programPath.scope) {
      if (isImportNamespaceSpecifier(binding.path.node)) {
        if (
          (binding.path.parent as ImportDeclaration).source.value === 'console'
        ) {
          return false;
        }
      }
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

export function bundlePath(
  pathToBundle: NodePath,
  programPath: NodePath<Program>
) {
  const outOfScopeBindings = new Set<Binding>();
  if (isIdentifier(pathToBundle.node)) {
    const binding = programPath.scope.getBinding(pathToBundle.node.name);
    if (
      validateBinding(
        binding,
        pathToBundle as NodePath<Identifier>,
        programPath,
        pathToBundle
      )
    ) {
      outOfScopeBindings.add(binding!);
    }
  } else {
    pathToBundle.traverse({
      // @ts-ignore
      ReferencedIdentifier(path: NodePath<Identifier>) {
        const binding = path.scope.getBinding(path.node.name);
        if (validateBinding(binding, path, programPath, pathToBundle)) {
          outOfScopeBindings.add(binding!);
        }
      },
    });
  }

  return program(
    Array.from(outOfScopeBindings)
      .map(binding => binding.path.node as Statement)
      .map(node => {
        if (isVariableDeclarator(node)) {
          return variableDeclaration('const', [node]);
        }
        return node;
      })
      .concat([
        isStatement(pathToBundle.node)
          ? pathToBundle.node
          : expressionStatement(pathToBundle.node as Expression),
      ])
  );
}
