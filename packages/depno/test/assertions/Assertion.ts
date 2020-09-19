import Expect from 'expect';

export type Assertion<TAcutal> = (
  expect: typeof Expect,
  actual: TAcutal
) => void | Promise<void>;

export function assertion<TActual>(cb: Assertion<TActual>) {
  return cb;
}
