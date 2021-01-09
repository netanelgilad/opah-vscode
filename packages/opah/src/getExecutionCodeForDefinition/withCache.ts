import { Map } from 'immutable';

export function withCache<TParam, TResult>(fn: (param: TParam) => TResult) {
  let cache = Map<TParam, TResult>();
  return (param: TParam) => {
    const cachedResult = cache.get(param);
    if (cachedResult) {
      return cachedResult;
    } else {
      const result = fn(param);
      cache = cache.set(param, result);
      return result;
    }
  };
}
