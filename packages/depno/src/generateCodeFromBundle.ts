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
import { List, Set } from 'immutable';
import { Bundle, Definition, ExecutionBundle } from './Bundle';
import { DefinitionNotFoundInBundleError } from './DefinitionNotFoundInBundleError';
import { canonicalIdentifier, CanonicalName } from './fullyQualifiedIdentifier';

export async function generateCodeFromBundle(bundle: ExecutionBundle) {
  const [definitionsDeclarations] = getDeclarationsFromBundle(
    bundle.definitions,
    bundle.execute.references.valueSeq().toSet(),
    Set()
  );
  const executionProgram = program(
    definitionsDeclarations
      .push(
        expressionStatement(
          callExpression(
            arrowFunctionExpression(
              bundle.execute.references
                .keySeq()
                .map(reference => identifier(reference))
                .toArray(),
              bundle.execute.expression
            ),
            bundle.execute.references
              .valueSeq()
              .map(canonicalIdentifier)
              .map(x => identifier(x))
              .toArray()
          )
        )
      )
      .toArray()
  );

  const { code } = (await generate(executionProgram, undefined, {
    filename: 'a.ts',
  }))!;

  return code!;
}

function getDeclarationsFromBundle(
  bundle: Bundle,
  canonicalNames: Set<CanonicalName>,
  seenDeclarations: Set<CanonicalName>
): [List<Statement>, Set<CanonicalName>] {
  return canonicalNames.reduce(
    ([result, seenDeclarations], canonicalName) => {
      if (seenDeclarations.has(canonicalName)) {
        return [result, seenDeclarations];
      }

      const definition = bundle.get(canonicalName);
      if (!definition) {
        throw DefinitionNotFoundInBundleError({ canonicalName, bundle });
      }

      const [
        referencesDeclarations,
        updatedSeenDeclarations,
      ] = getDeclarationsFromBundle(
        bundle,
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
