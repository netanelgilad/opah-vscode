import { variant, fields } from 'variant';
import { CanonicalName } from './fullyQualifiedIdentifier';

export const DefinitionNotFoundInCanonicalDefinitionError = variant(
  'DefinitionNotFoundInCanonicalDefinition',
  fields<{ canonicalName: CanonicalName; reference: string }>()
);
