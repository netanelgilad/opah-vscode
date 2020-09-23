import Expect from 'expect';

export type Assertion<TAcutal> = (
  expect: typeof Expect,
  actual: TAcutal
) => void | Promise<void>;

export function assertion<TActual>(cb: Assertion<TActual>) {
  return cb;
}

export type OtherwiseCallback = (
  error: Error
) => string | Promise<string> | void;

export type Otherwise = {
  __tag: 'otherwise';
  value: OtherwiseCallback;
};

export function isOtherwise(arg: any): arg is Otherwise {
  return arg && arg.__tag === 'otherwise';
}

export type Within = {
  __tag: 'within';
  ms: number;
};

export function isWithin(arg: any): arg is Within {
  return arg && arg.__tag === 'within';
}

export function otherwise(cb: OtherwiseCallback) {
  return {
    __tag: 'otherwise',
    value: cb,
  } as Otherwise;
}

export function within(value: number) {
  return {
    milliseconds: { __tag: 'within', ms: value } as Within,
  };
}
