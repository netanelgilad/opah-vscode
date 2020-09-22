#!/usr/bin/env node
import { runFile } from './index';

(async () => {
  const fileToRun = process.argv[2];
  const exportedFunctionName = process.argv[3];
  const parameters = process.argv.slice(4);
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
})();
