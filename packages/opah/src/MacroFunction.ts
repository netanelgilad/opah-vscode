import { CanonicalName } from './CanonicalName';
import { Definition } from './Definition';
import { Map } from 'immutable';
import { Closure } from './Closure';

type MaybePromise<T> = T | Promise<T>;

type MapToClosure<T> = { [K in keyof T]: Closure<T[K]> };

export type MacroFunction<T extends any[] = unknown[], TReturn extends any = unknown> = (
  ...args: MapToClosure<T>
) => MaybePromise<Closure<TReturn> | [Closure<TReturn>, Map<CanonicalName, Definition>]>;
