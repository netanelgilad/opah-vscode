import { variant, fields } from 'variant';
import { Bundle } from './Bundle';
import { CanonicalName } from './fullyQualifiedIdentifier';

export const DefinitionNotFoundInBundleError = variant(
  'DefinitionNotFoundInBundleError',
  fields<{ canonicalName: CanonicalName; bundle: Bundle }>()
);
