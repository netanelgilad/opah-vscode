import { NodePath } from '@babel/core';
import { ExpressionStatement, identifier, Identifier } from '@babel/types';
import { ExecutionBundle } from '.';
import { CaononicalDefinitionNode } from './Bundle';
import {
  CanonicalName,
  canonicalNameFromCanonicalIdentifier,
  fullyQualifiedIdentifier,
} from './fullyQualifiedIdentifier';
import { nodeModules } from './nodeModules';
import { transformReferencesInNode } from './transformReferencesInDefinitionNode';

export async function replaceReferencesWithCanonicalNamesInBundle(
  bundle: ExecutionBundle,
  expressionReferencesToCanonicalNames?: Map<string, CanonicalName>
): Promise<ExecutionBundle> {
  for (const [
    canonicalIdentifier,
    definitionNode,
  ] of bundle.definitions.entries()) {
    const canonicalName = canonicalNameFromCanonicalIdentifier(
      canonicalIdentifier
    );
    if (
      ![fullyQualifiedIdentifier('console', 'console')].includes(
        canonicalIdentifier
      ) &&
      !nodeModules.includes(canonicalName.uri)
    ) {
      const transformedDefinitionNode = await replaceReferencesInNode(
        definitionNode,
        bundle.referencesInDefinitions.get(canonicalIdentifier)!
      );

      bundle.definitions.set(
        canonicalIdentifier,
        transformedDefinitionNode as CaononicalDefinitionNode
      );
    }
  }

  let transformedExpression = bundle.expression;
  if (expressionReferencesToCanonicalNames) {
    transformedExpression = (await replaceReferencesInNode(
      bundle.expression,
      expressionReferencesToCanonicalNames
    )) as ExpressionStatement;
  }

  return {
    ...bundle,
    expression: transformedExpression,
  };
}

async function replaceReferencesInNode<
  T extends ExpressionStatement | CaononicalDefinitionNode
>(node: T, referencesToCanonicalNames: Map<string, CanonicalName>) {
  const transformedDefinitionNode = await transformReferencesInNode(
    node,
    (referencePath: NodePath<Identifier>) => {
      let canonicalName: CanonicalName | undefined;
      if (referencePath.node.name === 'console') {
        canonicalName = { uri: 'console', name: 'console' };
      } else {
        canonicalName = referencesToCanonicalNames.get(
          referencePath.node.name
        )!;
      }

      if (canonicalName) {
        referencePath.replaceWith(
          identifier(
            fullyQualifiedIdentifier(canonicalName.uri, canonicalName.name)
          )
        );
      }
    }
  );

  return transformedDefinitionNode;
}
