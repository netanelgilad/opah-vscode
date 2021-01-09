import { Expression, nullLiteral } from '@babel/types';
import { Map, Record, RecordOf } from 'immutable';
import { CanonicalName } from './core';
import { LocalName } from './LocalName';

export type ClosureProps<TReturn = unknown> = {
  expression: Expression;
  references: Map<LocalName, CanonicalName>;
} & { __tag?: TReturn };

export const Closure: <T extends any>(
  ...args: Parameters<Record.Factory<ClosureProps<T>>>
) => ReturnType<Record.Factory<ClosureProps<T>>> = Record<ClosureProps<any>>({
  expression: nullLiteral(),
  references: Map(),
});

export type Closure<TReturn = unknown> = RecordOf<ClosureProps<TReturn>>;
