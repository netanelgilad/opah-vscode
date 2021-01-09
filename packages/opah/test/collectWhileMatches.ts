import { Readable } from 'stream';

export async function collectWhileMatches(
  stream: Readable,
  toMatch: string
): Promise<[boolean, string?]> {
  return new Promise(resolve => {
    let result = '';
    let currentPosition = 0;

    const listener = (chunk: any) => {
      const chunkAsString = String(chunk);
      result += chunkAsString;
      if (
        toMatch.substr(currentPosition, chunkAsString.length) !== chunkAsString
      ) {
        stream.removeListener('data', listener);
        resolve([false, result]);
      } else {
        currentPosition = currentPosition + chunkAsString.length;
        if (currentPosition >= toMatch.length) {
          stream.removeListener('data', listener);
          resolve([true]);
        }
      }
    };

    stream.on('data', listener);
    stream.on('end', () => resolve([false, result]));
  });
}
