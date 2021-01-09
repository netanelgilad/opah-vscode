import {
  classDeclaration,
  Declaration,
  expressionStatement,
  functionDeclaration,
  identifier,
  importDeclaration,
  importSpecifier,
  isClassDeclaration,
  isFunctionDeclaration,
  isVariableDeclaration,
  program,
  Statement,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { List, Map, Set } from 'immutable';
import { canonicalIdentifier } from '../canonicalIdentifier';
import { CanonicalName } from '../CanonicalName';
import { Closure } from '../Closure';
import { Definition } from '../Definition';
import { opahAPIsURIs } from '../opahAPIsURIs';
import { DefinitionNotFoundInBundleError } from '../errors/DefinitionNotFoundInBundleError';
import { replaceReferencesToCanonicalReferences } from '../replaceReferencesToCanonicalNames';

export function getProgramFromBundle(
  definitions: Map<CanonicalName, Definition>,
  execute: Closure
) {
  const [definitionsDeclarations] = getDeclarationsFromBundle(
    definitions,
    execute.references.valueSeq().toSet(),
    Set()
  );

  const replacedExecuteExpression = replaceReferencesToCanonicalReferences(
    execute.expression,
    execute.references
  );

  return program(
    definitionsDeclarations
      .push(expressionStatement(replacedExecuteExpression))
      .toArray()
  );
}

function getDeclarationsFromBundle(
  definitions: Map<CanonicalName, Definition>,
  canonicalNames: Set<CanonicalName>,
  seenDeclarations: Set<CanonicalName>
): [List<Statement>, Set<CanonicalName>] {
  return canonicalNames.reduce(
    ([result, seenDeclarations], canonicalName) => {
      if (seenDeclarations.has(canonicalName)) {
        return [result, seenDeclarations];
      }

      const definition = definitions.get(canonicalName);
      if (!definition) {
        throw DefinitionNotFoundInBundleError({ canonicalName, definitions });
      }

      const [
        referencesDeclarations,
        updatedSeenDeclarations,
      ] = getDeclarationsFromBundle(
        definitions,
        definition.references
          .valueSeq()
          .toSet()
          .filter(x => !x.equals(canonicalName)),
        seenDeclarations.add(canonicalName)
      );
      const declaration = declarationOfDefinition(canonicalName, definition);
      return [
        result.concat(referencesDeclarations).push(declaration),
        updatedSeenDeclarations,
      ];
    },
    [List(), seenDeclarations]
  );
}

function declarationOfDefinition(
  canonicalName: CanonicalName,
  definition: Definition
) {
  if (opahAPIsURIs.includes(canonicalName.uri)) {
    return importDeclaration(
      [
        importSpecifier(
          identifier(canonicalIdentifier(canonicalName)),
          identifier(canonicalName.name)
        ),
      ],
      stringLiteral(canonicalName.uri)
    );
  }

  const declarationWithReplacedReferences = replaceReferencesToCanonicalReferences(
    definition.declaration,
    definition.references,
    canonicalName
  );

  const declarationWithCanonicalName = replaceDeclarationId(
    declarationWithReplacedReferences,
    canonicalIdentifier(canonicalName)
  );

  return declarationWithCanonicalName;
}

function replaceDeclarationId(declaration: Declaration, id: string) {
  if (isVariableDeclaration(declaration)) {
    return variableDeclaration('const', [
      variableDeclarator(identifier(id), declaration.declarations[0].init),
    ]);
  } else if (isFunctionDeclaration(declaration)) {
    return functionDeclaration(
      identifier(id),
      declaration.params,
      declaration.body,
      declaration.generator,
      declaration.async
    );
  } else if (isClassDeclaration(declaration)) {
    return classDeclaration(
      identifier(id),
      declaration.superClass,
      declaration.body,
      declaration.decorators
    );
  }
  throw new Error(`Unknown declaration type: ${declaration.type}`);
}
