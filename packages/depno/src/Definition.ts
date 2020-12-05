import { Expression, numericLiteral, unaryExpression } from '@babel/types';
import { Map, Record, RecordOf } from 'immutable';
import { CanonicalName } from './core';
import { LocalName } from './LocalName';

export type DefinitionProps<ExpressionType extends Expression = Expression> = {
  expression: ExpressionType;
  references: Map<LocalName, CanonicalName>;
};

export const Definition = Record<DefinitionProps>({
  expression: unaryExpression('void', numericLiteral(0)),
  references: Map(),
});

export type Definition<
  ExpressionType extends Expression = Expression
> = RecordOf<DefinitionProps<ExpressionType>>;
