import { transformFromAstAsync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import * as types from '@babel/types';
import { Identifier } from '@babel/types';
import { ExecutionBundle } from '.';
import { CaononicalDefinitionNode } from './bundleDefinitionsForPath2';
import { canonicalNameFromCanonicalIdentifier } from './fullyQualifiedIdentifier';

export async function runMacrosInBundle(
  bundle: ExecutionBundle
): Promise<ExecutionBundle> {
  let definitions = bundle.definitions;
  for (const [macroCanonicalIdentifier, macroFunction] of bundle.macros) {
    for (const [
      definitionCanonicalIdentifier,
      definitionNode,
    ] of bundle.definitions) {
      let replacementHappened = false;
      const { ast } = (await transformFromAstAsync(
        types.program([definitionNode]),
        undefined,
        {
          filename: 'a.ts',
          code: false,
          ast: true,
          plugins: [
            () => ({
              visitor: {
                // @ts-ignore
                ReferencedIdentifier(referencePath: NodePath<Identifier>) {
                  if (referencePath.node.name === macroCanonicalIdentifier) {
                    const macroResult = macroFunction({
                      definitions: bundle.definitions,
                      types,
                      node: referencePath.parentPath
                        .node as types.CallExpression,
                      definitionCanonicalName: canonicalNameFromCanonicalIdentifier(
                        definitionCanonicalIdentifier
                      ),
                    });
                    if (macroResult.replacement) {
                      replacementHappened = true;
                      referencePath.parentPath.replaceWith(
                        macroResult.replacement
                      );
                    }
                    definitions = macroResult.definitions ?? definitions;
                  }
                },
              },
            }),
          ],
        }
      ))!;

      if (replacementHappened) {
        definitions.set(
          definitionCanonicalIdentifier,
          ast!.program.body[0] as CaononicalDefinitionNode
        );
      }
    }
  }

  return {
    definitions,
    expression: bundle.expression,
    macros: new Map(),
  };
}
