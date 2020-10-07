import { NodePath } from '@babel/core';
import {
  Program,
  isStatement,
  isExportDefaultDeclaration,
  isFunctionDeclaration,
  isClassDeclaration,
  expressionStatement,
  Expression,
  identifier,
  FunctionDeclaration,
  Identifier,
  isVariableDeclarator,
  program,
} from '@babel/types';
import { bundleDefinitionsForPath } from './bundleDefinitionsForPath';
import { fullyQualifiedIdentifier } from './fullyQualifiedIdentifier';

export async function bundleIntoASingleProgram(
  pathToBundle: NodePath,
  isDefinition: boolean,
  programPath: NodePath<Program>,
  uri: string,
  useCanonicalNames?: boolean
) {
  const definitions = await bundleDefinitionsForPath({
    pathToBundle,
    isDefinition,
    programPath,
    currentURI: uri,
    useCanonicalNames,
  });

  const pathValueStatement = isStatement(pathToBundle.node)
    ? isExportDefaultDeclaration(pathToBundle.node)
      ? isFunctionDeclaration(pathToBundle.node) ||
        isClassDeclaration(pathToBundle.node)
        ? pathToBundle.node
        : expressionStatement(pathToBundle.node.declaration as Expression)
      : isFunctionDeclaration(pathToBundle.node)
      ? expressionStatement(
          identifier(
            fullyQualifiedIdentifier(
              uri,
              ((pathToBundle.node as FunctionDeclaration).id as Identifier).name
            )
          )
        )
      : pathToBundle.node
    : isVariableDeclarator(pathToBundle.node)
    ? expressionStatement(
        identifier(
          fullyQualifiedIdentifier(
            uri,
            (pathToBundle.node.id as Identifier).name
          )
        )
      )
    : expressionStatement(pathToBundle.node as Expression);

  return program(definitions.concat([pathValueStatement]), undefined, 'module');
}
