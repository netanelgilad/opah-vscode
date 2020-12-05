import {
  ClassDeclaration,
  ExportDefaultDeclaration,
  FunctionDeclaration,
  VariableDeclarator,
} from '@babel/types';

export type ReferencedDefinitionNode =
  | VariableDeclarator
  | FunctionDeclaration
  | ClassDeclaration
  | ExportDefaultDeclaration;
