import { variant, fields } from 'variant';

export const DefinitionNotFoundError = variant(
  'DefinitionNotFoundError',
  fields<{ reference: string }>()
);
