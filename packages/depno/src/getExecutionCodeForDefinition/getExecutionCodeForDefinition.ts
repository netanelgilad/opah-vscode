import { Map } from 'immutable';
import { getDefinitionForCanonicalName } from './getDefinitionForCanonicalName';
import { CanonicalName } from '../core';
import { Definition } from '../Definition';
import { generateCodeFromBundle } from './generateCodeFromBundle';
import { isMacroDefinition } from './isMacroDefinition';
import { processMacros } from './processMacros/processMacros';

export async function getExecutionCodeForDefinition(definition: Definition) {
  let definitions = Map<CanonicalName, Definition>();
  let references = definition.references.valueSeq().toSet();
  while (references.size > 0) {
    const reference = references.first(false);
    if (!reference) {
      throw new Error('ImpossibleState');
    }
    const definitionOfReference = await getDefinitionForCanonicalName(
      reference
    );
    if (!isMacroDefinition(definitionOfReference)) {
      const updatedDefinition = await processMacros(
        reference,
        definitionOfReference
      );
      definitions = definitions.set(reference, updatedDefinition);
      references = references.merge(
        updatedDefinition.references.valueSeq().toSet()
      );
    }

    references = references.remove(reference);
  }

  const code = generateCodeFromBundle(definitions, definition);

  return code;
}
