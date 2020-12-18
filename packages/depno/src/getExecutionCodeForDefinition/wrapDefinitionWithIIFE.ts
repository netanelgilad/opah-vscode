import { canonicalIdentifier } from '../canonicalIdentifier';
import { callExpression, arrowFunctionExpression, identifier } from '../core';
import { Definition } from '../Definition';

export function wrapDefinitionWithIIFE(definition: Definition) {
  return callExpression(
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
  );
}
