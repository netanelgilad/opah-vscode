import {
  CallExpression,
  ClassDeclaration,
  ExportDefaultDeclaration,
  FunctionDeclaration,
  ImportDeclaration,
  Node,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types';
import { CanonicalName } from './fullyQualifiedIdentifier';

export type ReferencedDefinitionNode =
  | VariableDeclarator
  | FunctionDeclaration
  | ClassDeclaration
  | ExportDefaultDeclaration;

export type CaononicalDefinitionNode =
  | ImportDeclaration
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration;

export type MacroFunction = (opts: {
  definitions: Map<string, CaononicalDefinitionNode>;
  referencesInDefinitions: Map<string, Map<string, CanonicalName>>;
  types: typeof import('@babel/types');
  node: CallExpression;
  definitionCanonicalName: CanonicalName;
}) => {
  replacement?: Node;
  definitions?: Map<string, CaononicalDefinitionNode>;
};

export type Bundle = {
  definitions: Map<string, CaononicalDefinitionNode>;
  referencesInDefinitions: Map<string, Map<string, CanonicalName>>;
  macros: Map<string, MacroFunction>;
};
