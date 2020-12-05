import { CallExpression, isCallExpression, isIdentifier } from '@babel/types';
import { CanonicalName } from '../CanonicalName';
import { Definition } from '../Definition';

export function isMacroDefinition(
  definition: Definition
): definition is Definition<CallExpression> {
  return (
    isCallExpression(definition.expression) &&
    isIdentifier(definition.expression.callee) &&
    definition.references.has(definition.expression.callee.name) &&
    definition.references
      .get(definition.expression.callee.name)!
      .equals(CanonicalName({ uri: '@depno/core', name: 'createMacro' }))
  );
}
