import { NodePath } from '@babel/core';
import { Declaration, Program } from '@babel/types';
import { Map } from 'immutable';
import { CanonicalName } from '../core';
import { DefinitionNotFoundError } from '../DefinitionNotFoundError';
import { getOutOfScopeReferences } from '../getOutOfScopeReferences';
import { LocalName } from '../LocalName';
import { getCanonicalNameFromPath } from './getCanonicalNameFromPath';
import { globals } from './globals';

export function getReferencesFromDeclaration(
  declaration: Declaration,
  uri: string,
  programPath: NodePath<Program>
) {
  return Map(
    getOutOfScopeReferences(declaration)
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
