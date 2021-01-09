import { variant, fields } from 'variant';
import { CanonicalName } from '../CanonicalName';

export const DefinitionNotFoundInCanonicalDefinitionError = variant(
  'DefinitionNotFoundInCanonicalDefinition',
  fields<{ canonicalName: CanonicalName; reference: string }>()
);
