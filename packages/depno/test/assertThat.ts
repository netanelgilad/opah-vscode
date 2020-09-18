import Expect from 'expect';
declare const expect: typeof Expect;

export function assertThat<T, TReturn>(
  something: T,
  assertion: (expect: typeof Expect, something: T) => TReturn
): TReturn {
  return assertion(expect, something);
}
