import { CanonicalName } from './CanonicalName';
import { Definition } from './Definition';
import { Map } from 'immutable';
import { Closure } from './Closure';

type MaybePromise<T> = T | Promise<T>;

export type MacroFunction = (
  ...args: Closure[]
) => MaybePromise<Closure | [Closure, Map<CanonicalName, Definition>]>;
