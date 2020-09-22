import Expect from 'expect';
import { Assertion, Otherwise } from './assertions/Assertion';
declare const expect: typeof Expect;

export async function assertThat<T>(
  something: T,
  assertion: Assertion<T>,
  otherwise?: Otherwise
) {
  try {
    await assertion(expect, something);
  } catch (err) {
    if (otherwise) {
      const moreInfo = await otherwise.value(err);
      err.message += '\n\nMore Information provided:\n' + moreInfo;
      throw err;
    } else {
      throw err;
    }
  }
}
