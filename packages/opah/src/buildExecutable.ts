import { Program } from '@babel/types';
import { writeFileSync } from 'fs';
import { copy } from 'fs-extra';
import { dirname, join } from 'path';
import { exec } from 'pkg';
import { directory } from 'tempy';
import {
  CoreModulesLocations,
  getCodeFromExecutionProgram,
} from './getCodeFromExecutionProgram';

export async function buildExecutable(
  program: Program,
  coreModulesLocations: CoreModulesLocations,
  options: {
    target: 'host';
    output: string;
  }
) {
  const tmpDir = directory();

  await copy(coreModulesLocations['@opah/core'], join(tmpDir, 'core'));
  await copy(coreModulesLocations['@opah/host'], join(tmpDir, 'host'));
  await copy(join(dirname(require.resolve('pkg/package.json')), 'dictionary'), join(tmpDir, 'dictionary'));
  await copy(
    coreModulesLocations['@opah/immutable'],
    join(tmpDir, 'immutable')
  );

  const code = await getCodeFromExecutionProgram(program);

  writeFileSync(join(tmpDir, 'index.js'), code);
  writeFileSync(
    join(tmpDir, 'pkg.config.json'),
    JSON.stringify({
      assets: ['**/*'],
    })
  );

  await exec([
    join(tmpDir, 'index.js'),
    '--config',
    join(tmpDir, 'pkg.config.json'),
    '--target',
    options.target,
    '--output',
    options.output,
  ]);
}
