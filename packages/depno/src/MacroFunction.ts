import { CanonicalName } from './CanonicalName';
import { Definition } from './Definition';
import { Map } from 'immutable';

type MaybePromise<T> = T | Promise<T>;

export type MacroFunction = (
  ...args: Definition[]
) => MaybePromise<Definition | [Definition, Map<CanonicalName, Definition>]>;
