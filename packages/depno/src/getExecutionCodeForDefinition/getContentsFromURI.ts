import { readFileSync } from 'fs';
import axios from 'axios';
import { Map } from 'immutable';

export type URIStore = Map<string, string>;

export async function getContentsFromURI(
  uriStore: URIStore,
  uri: string
): Promise<[URIStore, string]> {
  const existing = uriStore.get(uri);
  if (!existing) {
    try {
      const contents = uri.startsWith('/')
        ? readFileSync(uri, 'utf8')
        : (await axios.get(uri)).data;

      return [uriStore.set(uri, contents), contents];
    } catch (err) {
      throw new Error(
        `Failed to get contents from uri: ${uri}: ${err.message}`
      );
    }
  } else {
    return [uriStore, existing];
  }
}
