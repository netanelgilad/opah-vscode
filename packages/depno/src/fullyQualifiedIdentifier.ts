import { Record, RecordOf } from 'immutable';

function sanitizeURI(uri: string) {
  return uri
    .replace(/_/g, '$_')
    .replace(/\//g, '$__')
    .replace(/\./g, '$___')
    .replace(/@/g, '$____')
    .replace(/:/g, '$_____')
    .replace(/-/, '$______');
}

function desanitizeURI(uri: string) {
  return uri
    .replace(/\$______/g, '-')
    .replace(/\$_____/g, ':')
    .replace(/\$____/g, '@')
    .replace(/\$___/g, '.')
    .replace(/\$__/g, '/')
    .replace(/\$_/g, '_');
}

const separator = '$$$';

export function fullyQualifiedIdentifier(uri: string, name: string) {
  return `${sanitizeURI(uri)}${separator}${name}`;
}

export function canonicalNameFromCanonicalIdentifier(identifier: string) {
  const parts = identifier.split(separator);
  return {
    uri: desanitizeURI(parts[0]),
    name: parts[1],
  };
}

export function canonicalIdentifier(name: CanonicalName) {
  return fullyQualifiedIdentifier(name.uri, name.name);
}

export type CanonicalNameProps = {
  uri: string;
  name: string;
};

const makeCanonicalName = Record<CanonicalNameProps>({
  uri: '',
  name: '',
});

export const CanonicalName = (props: CanonicalNameProps) =>
  makeCanonicalName(props);

export type CanonicalName = RecordOf<CanonicalNameProps>;
