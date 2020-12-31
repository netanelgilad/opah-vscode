import { Expression, nullLiteral } from '@babel/types';
import { Map, Record, RecordOf } from 'immutable';
import { CanonicalName } from './core';
import { LocalName } from './LocalName';

export type ClosureProps = {
  expression: Expression;
  references: Map<LocalName, CanonicalName>;
};

export const Closure = Record<ClosureProps>({
  expression: nullLiteral(),
  references: Map(),
});

export type Closure = RecordOf<ClosureProps>;
