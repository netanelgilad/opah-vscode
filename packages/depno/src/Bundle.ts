import {
  ClassDeclaration,
  ExportDefaultDeclaration,
  Expression,
  FunctionDeclaration,
  numericLiteral,
  unaryExpression,
  VariableDeclarator,
} from '@babel/types';
import { Map, Record, RecordOf } from 'immutable';
import { CanonicalName } from './fullyQualifiedIdentifier';

export type ReferencedDefinitionNode =
  | VariableDeclarator
  | FunctionDeclaration
  | ClassDeclaration
  | ExportDefaultDeclaration;

export type MacroFunction = (...args: ExecutionBundle[]) => ExecutionBundle;

export type LocalName = string;

export type Definitions = Map<CanonicalName, Expression>;

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

export type Bundle = Map<CanonicalName, Definition>;

export type ExecutionBundleProps = {
  definitions: Bundle;
  execute: Definition;
};

export type ExecutionBundle = RecordOf<ExecutionBundleProps>;
export const ExecutionBundle = Record<ExecutionBundleProps>({
  definitions: Map(),
  execute: Definition(),
});

export function emptyBundle(): Bundle {
  return Map();
}
