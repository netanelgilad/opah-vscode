import { readFileSync } from 'fs';
import axios from 'axios';

export async function getContentsFromURI(uri: string) {
  try {
    return uri.startsWith('/')
      ? readFileSync(uri, 'utf8')
      : (await axios.get(uri)).data;
  } catch (err) {
    throw new Error(`Failed to get contents from uri: ${uri}: ${err.message}`);
  }
}
