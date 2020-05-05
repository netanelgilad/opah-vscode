import { readFileSync } from 'fs';
import axios from 'axios';

export async function getContentsFromURI(uri: string) {
  return uri.startsWith('/')
    ? readFileSync(uri, 'utf8')
    : (await axios.get(uri)).data;
}
