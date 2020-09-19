import { assertion } from './Assertion';

export function hasProperty<T, S extends keyof T>(key: S, expected: T[S]) {
  return assertion<T>((expect, actual) => {
    expect(actual).toHaveProperty(String(key), expected);
  });
}
