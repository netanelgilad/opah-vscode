import { Readable } from 'stream';

export async function collectStreamChunks(stream: Readable): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}
