import { NodePath } from '@babel/core';
import generate from '@babel/generator';
import { Expression, Identifier, VariableDeclarator } from '@babel/types';
import * as types from '@babel/types';
import { bundleIntoASingleProgram } from '../bundleIntoASingleProgram';

export async function createMacro(
  currentURI: string,
  path: NodePath<Identifier>,
  state: any
) {
  const macroVariableDeclaratorReferencePath = path.parentPath.parentPath;
  const macroName = ((macroVariableDeclaratorReferencePath.node as VariableDeclarator)
    .id as Identifier).name;
  const macroFunctionArgumentPath = path.parentPath.get(
    'arguments.0'
  ) as NodePath<Expression>;

  const programForMacroArgument = await bundleIntoASingleProgram(
    macroFunctionArgumentPath,
    false,
    state.file.path,
    currentURI,
    false
  );

  const code = generate(programForMacroArgument, {
    compact: true,
  }).code;

  const macroFunction = eval(code);
  const macroDefinitionBinding = path.scope.getBinding(macroName)!;
  for (const macroReference of macroDefinitionBinding.referencePaths) {
    macroFunction({
      reference: macroReference,
      types,
      state,
    });
    macroVariableDeclaratorReferencePath.remove();
  }
}
