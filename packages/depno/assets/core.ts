export type CanonicalName = {
  uri: string;
  name: string;
};

export function canonicalIdentifier(name: CanonicalName) {
  return fullyQualifiedIdentifier(name.uri, name.name);
}

const separator = '$$$';

export function fullyQualifiedIdentifier(uri: string, name: string) {
  return `${sanitizeURI(uri)}${separator}${name}`;
}

function sanitizeURI(uri: string) {
  return uri
    .replace(/_/g, '$_')
    .replace(/\//g, '$__')
    .replace(/\./g, '$___')
    .replace(/@/g, '$____')
    .replace(/:/g, '$_____')
    .replace(/-/, '$______');
}
