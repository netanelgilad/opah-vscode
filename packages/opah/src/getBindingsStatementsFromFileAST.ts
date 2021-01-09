import { Node } from '@babel/core';
import traverse, { Binding } from '@babel/traverse';
import {
  Expression,
  File,
  functionExpression,
  ImportDefaultSpecifier,
  ImportSpecifier,
  isFunctionDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportSpecifier,
  isVariableDeclaration,
  Statement,
} from '@babel/types';
import { Map } from 'immutable';

class NodeWithoutInitError extends Error { }

export function getBindingsStatementsFromFileAST(ast: File) {
  let bindings: { [name: string]: Binding};

  traverse(ast, {
    Program(path) {
      bindings = path.scope.getAllBindings() as { [name: string]: Binding}
    }
  })

  return Map(Object.entries(bindings!)).map(binding => {
    if (isPartOfImportStatement(binding.path.node)) {
      return binding.path.parentPath.node as Statement
    }
    return binding.path.node as Statement;
  })
}

function isPartOfImportStatement(
  node: Node
): node is ImportSpecifier | ImportDefaultSpecifier {
  return isImportSpecifier(node) || isImportDefaultSpecifier(node);
}

export function getExportedExpressionsFromFileAST(ast: File) {
  let canonicalNames = Map<string, Expression>();

  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (path.node.declaration) {
        if (isFunctionDeclaration(path.node.declaration)) {
          canonicalNames = canonicalNames.set(path.node.declaration.id!.name, functionExpression(
            path.node.declaration.id,
            path.node.declaration.params,
            path.node.declaration.body,
            path.node.declaration.generator,
            path.node.declaration.async
          ));
        } else if (isVariableDeclaration(path.node.declaration)) {
          path.node.declaration.declarations.forEach(declaration => {
            if (isIdentifier(declaration.id)) {
              if (!declaration.init) {
                throw new NodeWithoutInitError();
              }
              canonicalNames = canonicalNames.set(declaration.id.name, declaration.init);
            }
          });
        }
      }
    },
  });

  return canonicalNames;
}
