import { Declaration, variableDeclaration } from '@babel/types';
import { Map, Record, RecordOf } from 'immutable';
import { CanonicalName } from './core';
import { LocalName } from './LocalName';

export type DefinitionProps<T extends Declaration = Declaration> = {
  declaration: T;
  references: Map<LocalName, CanonicalName>;
};

export const Definition: <T extends Declaration>(
  ...args: Parameters<Record.Factory<DefinitionProps<T>>>
) => ReturnType<Record.Factory<DefinitionProps<T>>> = Record<DefinitionProps<any>>({
  declaration: variableDeclaration('const', []),
  references: Map(),
});

export type Definition<T extends Declaration = Declaration> = RecordOf<
  DefinitionProps<T>
>;
