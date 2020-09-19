import { assertion, Assertion } from './Assertion';

export function both<TActual>(a: Assertion<TActual>, b: Assertion<TActual>) {
  return assertion<TActual>(async (expect, actual) => {
    await a(expect, actual);
    await b(expect, actual);
  });
}
