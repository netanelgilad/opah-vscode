import { fields, variant } from 'variant';

export const EvalCodeOfBundleFailedError = variant(
  'EvalCodeOfBundleFailedError',
  fields<{ code: string; cause: unknown }>()
);
