import { fields, variant } from 'variant';
import { CanonicalName } from '../CanonicalName';
import { Definition } from '../Definition';
import { Map } from 'immutable';

export const DefinitionNotFoundInBundleError = variant(
  'DefinitionNotFoundInBundleError',
  fields<{
    canonicalName: CanonicalName;
    definitions: Map<CanonicalName, Definition>;
  }>()
);
