import { NodePath } from '@babel/core';
import { File, isExportSpecifier, Program } from '@babel/types';
import traverse from '@babel/traverse';

export function getDefinitionAndProgramPaths(ast: File, name: string) {
  let definitionPath: NodePath | undefined;
  let programPath: NodePath<Program>;

  traverse(ast, {
    Program(program) {
      programPath = program;
      let dependencyBinding;
      if (name === 'default') {
        programPath.traverse({
          ExportDefaultDeclaration: p => {
            dependencyBinding = { path: p };
          },
        });
      } else {
        dependencyBinding = programPath.scope.getBinding(name);
      }
      if (dependencyBinding) {
        definitionPath = dependencyBinding.path;
      }
    },
    ExportNamedDeclaration(path) {
      if (path.node.source && path.get('specifiers').some(specifier => {
        if (isExportSpecifier(specifier.node)) {
          return specifier.node.local.name === name;
        }
        return false;
      })) {
        definitionPath = path;
      }
    }
  });

  return {
    definitionPath,
    programPath: programPath!,
  };
}
