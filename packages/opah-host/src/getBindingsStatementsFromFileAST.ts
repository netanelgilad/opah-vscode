import traverse, { Binding, NodePath } from "@babel/traverse";
import {
  Expression,
  File,
  functionExpression,
  ImportDefaultSpecifier,
  ImportSpecifier,
  isExportSpecifier,
  isFunctionDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportSpecifier,
  isVariableDeclaration,
  Statement,
  Node,
} from "@babel/types";
import { Map } from "immutable";

class NodeWithoutInitError extends Error {}

export function getBindingsStatementsFromFileAST(ast: File) {
  let bindingsPaths: { [name: string]: NodePath<Node> };

  traverse(ast, {
    Program(path) {
      bindingsPaths = {
        ...bindingsPaths,
        ...Object.fromEntries(
          Object.entries(
            path.scope.getAllBindings()
          ).map(([name, binding]: [string, Binding]) => [name, binding.path])
        ),
      };
    },
    ExportDefaultDeclaration(path) {
      bindingsPaths = {
        ...bindingsPaths,
        default: path as NodePath<Node>,
      };
    },
    ExportNamedDeclaration(path) {
      bindingsPaths = {
        ...bindingsPaths,
        ...path.node.specifiers.reduce((result, specifier) => {
          if (isExportSpecifier(specifier)) {
            return {
              ...result,
              [specifier.local.name]: path,
            };
          }
          return result;
        }, {}),
      };
    },
  });

  return Map(Object.entries(bindingsPaths!)).map((path) => {
    if (isPartOfImportStatement(path.node)) {
      return path.parentPath.node as Statement;
    }
    return path.node as Statement;
  });
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
          canonicalNames = canonicalNames.set(
            path.node.declaration.id!.name,
            functionExpression(
              path.node.declaration.id,
              path.node.declaration.params,
              path.node.declaration.body,
              path.node.declaration.generator,
              path.node.declaration.async
            )
          );
        } else if (isVariableDeclaration(path.node.declaration)) {
          path.node.declaration.declarations.forEach((declaration) => {
            if (isIdentifier(declaration.id)) {
              if (!declaration.init) {
                throw new NodeWithoutInitError();
              }
              canonicalNames = canonicalNames.set(
                declaration.id.name,
                declaration.init
              );
            }
          });
        }
      }
    },
  });

  return canonicalNames;
}
