import Expect from 'expect';

export type Assertion<TAcutal> = (
  expect: typeof Expect,
  actual: TAcutal
) => void | Promise<void>;

export function assertion<TActual>(cb: Assertion<TActual>) {
  return cb;
}

export type OtherwiseCallback = (error: Error) => string | Promise<string>;

export type Otherwise = {
  __tag: 'otherwise';
  value: OtherwiseCallback;
};

export function otherwise(cb: OtherwiseCallback) {
  return {
    __tag: 'otherwise',
    value: cb,
  } as Otherwise;
}
