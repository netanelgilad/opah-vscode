import generate from '@babel/generator';
import {
  arrowFunctionExpression,
  callExpression,
  expressionStatement,
  identifier,
  program,
  Statement,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { List, Map, Set } from 'immutable';
import { CanonicalName } from '../CanonicalName';
import { Definition } from '../Definition';
import { DefinitionNotFoundInBundleError } from '../errors/DefinitionNotFoundInBundleError';
import { canonicalIdentifier } from '../canonicalIdentifier';

export function generateCodeFromBundle(
  definitions: Map<CanonicalName, Definition>,
  execute: Definition
) {
  const [definitionsDeclarations] = getDeclarationsFromBundle(
    definitions,
    execute.references.valueSeq().toSet(),
    Set()
  );
  const executionProgram = program(
    definitionsDeclarations
      .push(
        expressionStatement(
          callExpression(
            arrowFunctionExpression(
              execute.references
                .keySeq()
                .map(reference => identifier(reference))
                .toArray(),
              execute.expression
            ),
            execute.references
              .valueSeq()
              .map(canonicalIdentifier)
              .map(x => identifier(x))
              .toArray()
          )
        )
      )
      .toArray()
  );

  const { code } = generate(executionProgram, undefined, {
    filename: 'a.ts',
  })!;

  return code!;
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
  return variableDeclaration('var', [
    variableDeclarator(
      identifier(canonicalIdentifier(canonicalName)),
      callExpression(
        arrowFunctionExpression(
          definition.references
            .keySeq()
            .map(reference => identifier(reference))
            .toArray(),
          definition.expression
        ),
        definition.references
          .valueSeq()
          .map(canonicalIdentifier)
          .map(x => identifier(x))
          .toArray()
      )
    ),
  ]) as Statement;
}
