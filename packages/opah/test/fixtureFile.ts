import { writeFileSync, unlinkSync } from 'fs';
import { file, directory } from 'tempy';
import { join } from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';

export function* fixtureFile(contents: string, path?: string) {
  const tmpFilePath = path ?? file({ extension: 'ts' });
  writeFileSync(tmpFilePath, contents);

  yield () => {
    unlinkSync(tmpFilePath);
  };

  return tmpFilePath;
}

export type FolderStructure = {
  [entryName: string]: string;
};

export function* fixtureFolder(structure: FolderStructure) {
  const tmpDirectory = directory();
  for (const entryName in structure) {
    if (typeof structure[entryName] === 'string') {
      writeFileSync(join(tmpDirectory, entryName), structure[entryName]);
    }
  }

  yield async () => {
    await promisify(rimraf)(tmpDirectory);
  };

  return tmpDirectory;
}
