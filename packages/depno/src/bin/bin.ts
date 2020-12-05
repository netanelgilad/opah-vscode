#!/usr/bin/env node
import 'source-map-support/register';
import { ChildProcess } from 'child_process';
import { resolve } from 'path';
import { isOfVariant, match, variantList } from 'variant';
import { executeCanonicalName } from '../executeCanonicalName/executeCanonicalName';
import { CanonicalName } from '../CanonicalName';
import { DefinitionNotFoundInBundleError } from '../errors/DefinitionNotFoundInBundleError';
import { DefinitionNotFoundInCanonicalDefinitionError } from '../errors/DefinitionNotFoundInCanonicalDefinitionError';
import { EvalCodeOfBundleFailedError } from '../errors/EvalCodeOfBundleFailedError';

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
          EvalCodeOfBundleFailedError,
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
          EvalCodeOfBundleFailedError: ({ cause, code }) => `${cause}\n${code}`,
        });
      console.log(errorMessage);
    } else {
      console.log(err);
    }
    process.exit(1);
  }
})();

async function runFile(
  path: string,
  opts: {
    exportedFunctionName?: string;
    args?: any[];
    cwd?: string;
    silent?: boolean;
  } = {}
): Promise<ChildProcess> {
  const silent = opts.silent ?? true;
  const args = opts.args ?? [];
  const exportedFunctionName = opts.exportedFunctionName ?? 'default';
  const uri = path.startsWith('.')
    ? resolve(opts.cwd || process.cwd(), path)
    : path;

  const functionCanonicalName = CanonicalName({
    uri,
    name: exportedFunctionName,
  });

  return executeCanonicalName(functionCanonicalName, args, {
    cwd: opts.cwd,
    silent,
  });
}
