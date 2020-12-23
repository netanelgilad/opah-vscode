import { NodePath } from '@babel/core';
import { Expression, Program } from '@babel/types';
import { Map } from 'immutable';
import { CanonicalName } from '../core';
import { getCanonicalNameFromPath } from './getCanonicalNameFromPath';
import { globals } from './globals';
import { LocalName } from '../LocalName';
import { DefinitionNotFoundError } from '../DefinitionNotFoundError';
import { getOutOfScopeReferences } from '../getOutOfScopeReferences';

export function getReferencesFromExpression(
  expression: Expression,
  uri: string,
  programPath: NodePath<Program>
) {
  return Map(
    getOutOfScopeReferences(expression)
      .flatMap(reference => {
        const programBinding = programPath.scope.getBinding(reference);
        if (!programBinding) {
          if (globals.includes(reference)) {
            return [];
          } else {
            throw DefinitionNotFoundError({
              reference,
            });
          }
        }
        return [
          [reference, getCanonicalNameFromPath(programBinding.path, uri)] as [
            LocalName,
            CanonicalName
          ],
        ];
      })
      .toArray()
  );
}
