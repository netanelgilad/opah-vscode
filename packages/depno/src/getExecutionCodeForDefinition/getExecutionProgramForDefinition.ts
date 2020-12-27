import { Map } from 'immutable';
import { CanonicalName } from '../core';
import { Definition } from '../Definition';
import { getDefinitionForCanonicalName } from '../getDefinitionForCanonicalName';
import { getProgramFromBundle } from './generateCodeFromBundle';
import { isMacroDefinition } from './isMacroDefinition';
import { processMacros } from './processMacros/processMacros';

export async function getExecutionProgramForDefinition(definition: Definition) {
  let definitions = Map<CanonicalName, Definition>();
  let references = definition.references.valueSeq().toSet();
  while (references.size > 0) {
    const reference = references.first(false);
    if (!reference) {
      throw new Error('ImpossibleState');
    }
    if (!definitions.has(reference)) {
      const definitionOfReference = await getDefinitionForCanonicalName(
        reference
      );
      if (!isMacroDefinition(definitionOfReference)) {
        const [updatedDefinition, artificialDefinitions] = await processMacros(
          reference,
          definitionOfReference
        );
        definitions = definitions
          .merge(artificialDefinitions)
          .set(reference, updatedDefinition);
        references = references.merge(
          updatedDefinition.references.valueSeq().toSet()
        );
      }
    }

    references = references.remove(reference);
  }

  return getProgramFromBundle(definitions, definition);
}
