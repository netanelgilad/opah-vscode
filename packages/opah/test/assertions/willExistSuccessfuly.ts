import { ChildProcess } from 'child_process';
import { assertion } from './Assertion';

export const willExitSuccessfuly = assertion<ChildProcess>(
  async (expect, actual) => {
    const code = await new Promise(resolve => {
      actual.on('exit', code => {
        resolve(code);
      });
    });
    expect(code).toBe(0);
  }
);
