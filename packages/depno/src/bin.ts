#!/usr/bin/env node
import { runFile } from './index';

(async () => {
  const fileToRun = process.argv[2];
  const exportedFunctionName = process.argv[3];
  const parameters = process.argv.slice(4);
  const childProcess = await runFile(fileToRun, {
    exportedFunctionName,
    args: parameters.map(x => JSON.parse(x)),
  });

  childProcess.stdout!.pipe(process.stdout);
  childProcess.stderr!.pipe(process.stderr);
})();
