import { CanonicalName } from './CanonicalName';

function sanitizeURI(uri: string) {
  return uri
    .replace(/_/g, '$_')
    .replace(/\//g, '$__')
    .replace(/\./g, '$___')
    .replace(/@/g, '$____')
    .replace(/:/g, '$_____')
    .replace(/-/, '$______');
}

const separator = '$$$';

export function canonicalIdentifier(name: CanonicalName) {
  return `${sanitizeURI(name.uri)}${separator}${name.name}`;
}
