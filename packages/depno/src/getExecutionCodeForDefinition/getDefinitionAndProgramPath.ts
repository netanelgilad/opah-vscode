import { NodePath } from '@babel/core';
import { File, Program } from '@babel/types';
import traverse from '@babel/traverse';

export function getDefinitionAndProgramPaths(ast: File, name: string) {
  let definitionPath: NodePath | undefined;
  let programPath: NodePath<Program>;

  traverse(ast!, {
    Program(program: NodePath<Program>) {
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
  });

  return {
    definitionPath,
    programPath: programPath!,
  };
}
