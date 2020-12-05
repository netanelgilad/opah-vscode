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
import { CanonicalName } from '../../core';
import { executeDefinitionInContext } from './executeDefinitionInContext';
import { getOutOfScopeReferences } from './getOutOfScopeReferences';
import { isMacroDefinition } from '../isMacroDefinition';
import { Definition } from '../../Definition';
import { MacroFunction } from './MacroFunction';
import { getDefinitionForCanonicalName } from '../getDefinitionForCanonicalName';
import { withCache } from '../withCache';
import { LocalName } from '../../LocalName';

export async function processMacros(
  canonicalName: CanonicalName,
  definition: Definition
): Promise<Definition> {
  const macros = await filter(
    definition.references.values(),
    async referenceCanonicalName =>
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
        async macro =>
          [macro, await getMacroFunction(macro)] as [
            CanonicalName,
            MacroFunction
          ]
      )
    )
  );

  let tempProgram = program([expressionStatement(definition.expression)]);

  traverse(file(tempProgram, undefined, undefined), {
    CallExpression: {
      exit(referencePath) {
        if (
          isIdentifier(referencePath.node.callee) &&
          macrosFunctions.has(
            definition.references.get(referencePath.node.callee.name)!
          )
        ) {
          const macroLocalName = referencePath.node.callee.name;
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

          const replacement = macrosFunctions.get(
            definition.references.get(referencePath.node.callee.name)!
          )!(...argsDefinitions);
          referencePath.replaceWith(replacement.expression);
          definition = definition.set(
            'references',
            definition.references
              .merge(replacement.references)
              .remove(macroLocalName)
          );
        }
      },
    },
  });

  definition = definition.set(
    'expression',
    (tempProgram.body[0] as ExpressionStatement).expression
  );

  return definition;
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
