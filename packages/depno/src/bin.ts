#!/usr/bin/env node
import 'source-map-support/register';
import { isOfVariant, match, variantList } from 'variant';
import { DefinitionNotFoundInBundleError } from './DefinitionNotFoundInBundleError';
import { DefinitionNotFoundInCanonicalDefinitionError } from './DefinitionNotFoundInCanonicalDefinitionError';
import { runFile } from './index';

(async () => {
  const fileToRun = process.argv[2];
  const exportedFunctionName = process.argv[3];
  const parameters = process.argv.slice(4);
  try {
    await runFile(fileToRun, {
      exportedFunctionName,
      args: parameters.map(x => {
        if (x === '{stdin}') {
          return '__stdin__';
        } else if (x === '{stdout}') {
          return '__stdout__';
        } else {
          return JSON.parse(x);
        }
      }),
      silent: false,
    });
  } catch (err) {
    if (
      isOfVariant(
        err,
        variantList([
          DefinitionNotFoundInBundleError,
          DefinitionNotFoundInCanonicalDefinitionError,
        ])
      )
    ) {
      const errorMessage =
        err.type +
        ' : ' +
        match(err, {
          DefinitionNotFoundInBundleError: ({ canonicalName }) =>
            `Failed to find definition for ${JSON.stringify(
              canonicalName.toJSON()
            )}`,
          DefinitionNotFoundInCanonicalDefinition: ({
            reference,
            canonicalName,
          }) =>
            `Failed to find a definition for the reference ${reference} in the body of ${JSON.stringify(
              canonicalName.toJSON()
            )}`,
        });
      console.log(errorMessage);
    } else {
      console.log(err);
    }
    process.exit(1);
  }
})();
