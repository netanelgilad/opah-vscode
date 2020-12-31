import { Declaration, variableDeclaration } from '@babel/types';
import { Map, Record, RecordOf } from 'immutable';
import { CanonicalName } from './core';
import { LocalName } from './LocalName';

export type DefinitionProps<T extends Declaration = Declaration> = {
  declaration: T;
  references: Map<LocalName, CanonicalName>;
};

export const Definition = Record<DefinitionProps>({
  declaration: variableDeclaration('const', []),
  references: Map(),
});

export type Definition<T extends Declaration = Declaration> = RecordOf<
  DefinitionProps<T>
>;
