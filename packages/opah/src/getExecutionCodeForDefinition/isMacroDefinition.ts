import {
  isCallExpression,
  isIdentifier,
  isVariableDeclaration,
  VariableDeclaration,
} from '@babel/types';
import { CanonicalName } from '../CanonicalName';
import { Definition } from '../Definition';

export function isMacroDefinition(
  definition: Definition
): definition is Definition<VariableDeclaration> {
  return (
    isVariableDeclaration(definition.declaration) &&
    isCallExpression(definition.declaration.declarations[0].init) &&
    isIdentifier(definition.declaration.declarations[0].init.callee) &&
    definition.references.has(
      definition.declaration.declarations[0].init.callee.name
    ) &&
    definition.references
      .get(definition.declaration.declarations[0].init.callee.name)!
      .equals(CanonicalName({ uri: '@opah/core', name: 'createMacro' }))
  );
}
