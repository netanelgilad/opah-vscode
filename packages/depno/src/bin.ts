#!/usr/bin/env node
import 'source-map-support/register';
import { runFile } from './index';
import { isOfVariant, variantList } from 'variant';
import { DefinitionNotFoundInBundleError } from './DefinitionNotFoundInBundleError';

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
    if (isOfVariant(err, variantList([DefinitionNotFoundInBundleError]))) {
      console.log(
        `Failed to find definition for ${JSON.stringify(
          err.canonicalName.toJSON()
        )}`
      );
    } else {
      console.log(err);
    }
    process.exit(1);
  }
})();
