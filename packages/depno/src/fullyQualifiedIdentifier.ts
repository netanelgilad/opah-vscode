function sanitizeURI(uri: string) {
  return uri
    .replace(/\//g, '_')
    .replace(/\./g, '_')
    .replace(/@/g, '_')
    .replace(/:/g, '_')
    .replace(/-/, '_');
}

export function fullyQualifiedIdentifier(uri: string, name: string) {
  return `${sanitizeURI(uri)}_${name}`;
}
