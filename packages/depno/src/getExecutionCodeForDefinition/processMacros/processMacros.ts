import traverse from '@babel/traverse';
import {
  expressionStatement,
  ExpressionStatement,
  file,
  isIdentifier,
  program,
} from '@babel/types';
import { filter } from 'async';
import { Map } from 'immutable';
import { fields, variant } from 'variant';
import { assertExpression } from '../../assertExpression';
import { assertIdentifier } from '../../assertIdentifier';
import { canonicalIdentifier } from '../../canonicalIdentifier';
import { CanonicalName } from '../../core';
import { Definition } from '../../Definition';
import { executeDefinitionInContext } from '../../executeDefinitionInContext';
import { getDefinitionForCanonicalName } from '../../getDefinitionForCanonicalName';
import { LocalName } from '../../LocalName';
import { MacroFunction } from '../../MacroFunction';
import { isMacroDefinition } from '../isMacroDefinition';
import { withCache } from '../withCache';
import { wrapDefinitionWithIIFE } from '../wrapDefinitionWithIIFE';
import { getOutOfScopeReferences } from './getOutOfScopeReferences';

export async function processMacros(
  canonicalName: CanonicalName,
  definition: Definition
): Promise<[Definition, Map<CanonicalName, Definition>]> {
  let artificialDefinitions = Map<CanonicalName, Definition>();
  const macros = await filter(
    definition.references.entries(),
    async ([, referenceCanonicalName]) =>
      !referenceCanonicalName.equals(canonicalName) &&
      !referenceCanonicalName.equals(
        CanonicalName({
          uri: '@depno/core',
          name: 'createMacro',
        })
      ) &&
      isMacroDefinition(
        await getDefinitionForCanonicalName(referenceCanonicalName)
      )
  );

  const macrosFunctions = Map(
    await Promise.all(
      macros.map(
        async ([, macro]) =>
          [macro, await getMacroFunction(macro)] as [
            CanonicalName,
            MacroFunction
          ]
      )
    )
  );

  let tempProgram = program([expressionStatement(definition.expression)]);

  const transformPromises: Promise<void>[] = [];

  traverse(file(tempProgram, undefined, undefined), {
    CallExpression: {
      exit(referencePath) {
        if (
          isIdentifier(referencePath.node.callee) &&
          macrosFunctions.has(
            definition.references.get(referencePath.node.callee.name)!
          )
        ) {
          transformPromises.push(
            (async () => {
              await Promise.all(transformPromises);
              assertIdentifier(referencePath.node.callee);

              const argsDefinitions = referencePath.node.arguments.map(
                argExpression => {
                  assertExpression(argExpression);

                  const argReferences = getOutOfScopeReferences(
                    argExpression
                  ).reduce((result, reference) => {
                    if (definition.references.has(reference)) {
                      result = result.set(
                        reference,
                        definition.references.get(reference)!
                      );
                    }
                    return result;
                  }, Map<LocalName, CanonicalName>());

                  return Definition({
                    expression: argExpression,
                    references: argReferences,
                  });
                }
              );

              let replacement = await macrosFunctions.get(
                definition.references.get(referencePath.node.callee.name)!
              )!(...argsDefinitions);

              if (Array.isArray(replacement)) {
                artificialDefinitions = artificialDefinitions.merge(
                  replacement[1]
                );
                replacement = replacement[0];
              }

              const conflicts = replacement.references.filter(
                (canonicalName, localName) =>
                  definition.references.has(localName) &&
                  !definition.references.get(localName)!.equals(canonicalName)
              );

              let referencesToMerge = replacement.references;

              if (conflicts.size > 0) {
                referencePath.replaceWith(
                  wrapDefinitionWithIIFE(
                    Definition({
                      expression: replacement.expression,
                      references: conflicts,
                    })
                  )
                );
                referencesToMerge = replacement.references.mapEntries(([localName, canonicalName]) => {
                  if (conflicts.has(localName)) {
                    return [canonicalIdentifier(canonicalName), canonicalName]
                  } else {
                    return [localName, canonicalName]
                  }
                });
              } else {
                referencePath.replaceWith(replacement.expression);
              }

              definition = definition.set(
                'references',
                definition.references.merge(referencesToMerge)
              );
            })()
          );
        }
      },
    },
  });

  await Promise.all(transformPromises);

  definition = definition.set(
    'expression',
    (tempProgram.body[0] as ExpressionStatement).expression
  );
  definition = definition.set(
    'references',
    definition.references.removeAll(macros.map(x => x[0]))
  );

  return [definition, artificialDefinitions];
}

const NonMacroDefinitionError = variant(
  'NonMacroDefinitionError',
  fields<{ canonicalName: CanonicalName }>()
);

const getMacroFunction = withCache(
  async (macroCanonicalName: CanonicalName) => {
    const definition = await getDefinitionForCanonicalName(macroCanonicalName);
    if (!isMacroDefinition(definition)) {
      throw NonMacroDefinitionError({ canonicalName: macroCanonicalName });
    }
    assertExpression(definition.expression.arguments[0]);
    return (await executeDefinitionInContext(
      Definition({
        expression: definition.expression.arguments[0],
        references: definition.references,
      })
    )) as MacroFunction;
  }
);
