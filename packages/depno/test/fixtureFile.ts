import { writeFileSync, unlinkSync } from 'fs';
import { file } from 'tempy';

export function* fixtureFile(contents: string, path?: string) {
  const tmpFilePath = path ?? file({ extension: 'ts' });
  writeFileSync(tmpFilePath, contents);

  yield () => {
    unlinkSync(tmpFilePath);
  };

  return tmpFilePath;
}
