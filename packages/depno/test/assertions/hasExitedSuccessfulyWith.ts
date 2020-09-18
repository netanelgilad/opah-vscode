import { ChildProcess } from 'child_process';
import { collectStreamChunks } from '../collectStreamChunks';
import Expect from 'expect';

export function hasExitedSuccessfulyWith(expectedStdout: string) {
  return async (expect: typeof Expect, actual: ChildProcess) => {
    expect(actual.stderr).toBeDefined();
    let stderr = await collectStreamChunks(actual.stderr!);
    expect(stderr).toEqual('');

    expect(actual.stdout).toBeDefined();
    let stdout = await collectStreamChunks(actual.stdout!);
    expect(stdout).toEqual(expectedStdout);
  };
}
