import { ChildProcess } from 'child_process';
import { collectWhileMatches } from '../collectWhileMatches';
import { assertion } from './Assertion';

export const willPrint = (expected: string) =>
  assertion<ChildProcess>(async (expect, actual) => {
    expect(await collectWhileMatches(actual.stdout, expected)).toEqual([true]);
  });
