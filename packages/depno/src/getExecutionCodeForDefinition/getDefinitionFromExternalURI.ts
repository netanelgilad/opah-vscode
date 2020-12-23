import { Map } from 'immutable';
import { isType } from 'variant';
import { CanonicalName } from '../CanonicalName';
import { Definition } from '../Definition';
import { DefinitionNotFoundInCanonicalDefinitionError } from '../errors/DefinitionNotFoundInCanonicalDefinitionError';
import { getASTFromCode } from '../getASTFromCode';
import { getContentsFromURI } from './getContentsFromURI';
import { isReferencedDefinitionNode } from '../isReferencedDefinitionNode';
import { DefinitionNotFoundError } from '../DefinitionNotFoundError';
import { getDefinitionAndProgramPaths } from './getDefinitionAndProgramPath';
import { getExpressionFromReferencedDefinitionNode } from './getExpressionFromReferenceDefinitionNode';
import { getReferencesFromExpression } from '../getReferencesFromExpression/getReferencesFromExpression';
import { isExportNamedDeclaration, isExportSpecifier } from '@babel/types';
import { resolveURIFromDependency } from '../resolveURIFromDependency';

export async function getDefinitionFromExternalURI(
  canonicalName: CanonicalName,
): Promise<Definition> {
  let [, contents] = await getContentsFromURI(Map(), canonicalName.uri);
  let [, ast] = await getASTFromCode(Map(), contents, canonicalName.uri);

  const { definitionPath, programPath } = getDefinitionAndProgramPaths(
    ast,
    canonicalName.name
  );

  if (!definitionPath) {
    throw programPath.buildCodeFrameError(
      `Failed to find binding for ${canonicalName.name} at ${canonicalName.uri}`,
      ReferenceError
    );
  }

  const definitionNode = definitionPath.node;

  if (isExportNamedDeclaration(definitionNode)) {
    return getDefinitionFromExternalURI(
      CanonicalName({
        uri: resolveURIFromDependency(definitionNode.source!.value, canonicalName.uri),
        name: definitionNode.specifiers.find(
          specifier =>
            isExportSpecifier(specifier) &&
            specifier.local.name === canonicalName.name
        )!.exported.name,
      })
    );
  } else if (!isReferencedDefinitionNode(definitionNode)) {
    throw definitionPath.buildCodeFrameError(
      `Cannot bundle a non reference definition of node. The node type requested was ${definitionNode.type}`
    );
  }

  const definitionExpression = getExpressionFromReferencedDefinitionNode(
    definitionNode
  );

  let references: Map<string, CanonicalName>;
  try {
    references = getReferencesFromExpression(
      definitionExpression,
      canonicalName.uri,
      programPath
    );
  } catch (err) {
    if (isType(DefinitionNotFoundError, err)) {
      throw DefinitionNotFoundInCanonicalDefinitionError({
        canonicalName,
        reference: err.reference,
      });
    } else {
      throw err;
    }
  }

  return Definition({
    expression: definitionExpression,
    references,
  });
}
