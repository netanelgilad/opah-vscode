import Expect from 'expect';
import {
  Assertion,
  isOtherwise,
  isWithin,
  Otherwise,
  Within,
} from './assertions/Assertion';
import { types } from 'util';
declare const expect: typeof Expect;
declare const jest: any;

export async function assertThat<T>(
  something: T,
  assertion: Assertion<T>,
  within?: Within,
  otherwise?: Otherwise
);
export async function assertThat<T>(
  something: T,
  assertion: Assertion<T>,
  otherwise?: Otherwise
);
export async function assertThat<T>(
  something: T,
  assertion: Assertion<T>,
  otherwiseOrWithin?: Otherwise | Within,
  maybeOtherwise?: Otherwise
) {
  const within = isWithin(otherwiseOrWithin) ? otherwiseOrWithin : undefined;
  const otherwise = isOtherwise(otherwiseOrWithin)
    ? otherwiseOrWithin
    : maybeOtherwise;
  try {
    await new Promise((resolve, reject) => {
      let withinTimeout;
      if (within) {
        withinTimeout = setTimeout(() => {
          reject(
            new Error(`Assertion failed to complete within ${within.ms}ms`)
          );
        }, within.ms);
      }
      try {
        const maybePromise = assertion(expect, something);
        if (types.isPromise(maybePromise)) {
          (maybePromise as Promise<void>)
            .then(() => {
              clearTimeout(withinTimeout);
              resolve();
            })
            .catch(reject);
        } else {
          clearTimeout(withinTimeout);
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    if (otherwise) {
      const moreInfo = await otherwise.value(err);
      if (moreInfo) {
        err.message += '\n\nMore Information provided:\n' + moreInfo;
      }
      throw err;
    } else {
      throw err;
    }
  }
}
