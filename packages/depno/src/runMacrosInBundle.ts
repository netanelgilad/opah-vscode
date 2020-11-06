import { transformFromAstAsync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import * as types from '@babel/types';
import { Identifier } from '@babel/types';
import { Bundle, CaononicalDefinitionNode } from './Bundle';
import {
  canonicalIdentifier,
  canonicalNameFromCanonicalIdentifier,
} from './fullyQualifiedIdentifier';

export async function runMacrosInBundle(bundle: Bundle): Promise<Bundle> {
  let definitions = bundle.definitions;
  for (const [macroCanonicalIdentifier, macroFunction] of bundle.macros) {
    for (const [
      definitionCanonicalIdentifier,
      definitionNode,
    ] of bundle.definitions) {
      const currentDefinitionReferneces = bundle.referencesInDefinitions.get(
        definitionCanonicalIdentifier
      );
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
                  if (
                    currentDefinitionReferneces &&
                    currentDefinitionReferneces.has(referencePath.node.name)! &&
                    canonicalIdentifier(
                      currentDefinitionReferneces.get(referencePath.node.name)!
                    ) === macroCanonicalIdentifier
                  ) {
                    const macroResult = macroFunction({
                      definitions: bundle.definitions,
                      referencesInDefinitions: bundle.referencesInDefinitions,
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
    referencesInDefinitions: bundle.referencesInDefinitions,
    macros: new Map(),
  };
}
