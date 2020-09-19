import { ChildProcess } from 'child_process';
import { collectStreamChunks } from '../collectStreamChunks';
import { assertion } from './Assertion';

export function hasExitedSuccessfulyWith(expectedStdout: string) {
  return assertion<ChildProcess>(async (expect, actual) => {
    expect(actual.stderr).toBeDefined();
    let stderr = await collectStreamChunks(actual.stderr!);
    expect(stderr).toEqual('');

    expect(actual.stdout).toBeDefined();
    let stdout = await collectStreamChunks(actual.stdout!);
    expect(stdout).toEqual(expectedStdout);
  });
}
