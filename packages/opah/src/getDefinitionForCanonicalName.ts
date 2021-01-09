import {
  identifier,
  importDeclaration,
  importSpecifier,
  stringLiteral,
} from '@babel/types';
import { Map } from 'immutable';
import { CanonicalName } from './CanonicalName';
import { Definition } from './Definition';
import { opahAPIsURIs } from './opahAPIsURIs';
import { getDefinitionFromExternalURI } from './getExecutionCodeForDefinition/getDefinitionFromExternalURI';
import { withCache } from './getExecutionCodeForDefinition/withCache';

export const getDefinitionForCanonicalName = withCache(
  async (canonicalName: CanonicalName) => {
    if (opahAPIsURIs.includes(canonicalName.uri)) {
      return Definition({
        declaration: importDeclaration(
          [
            importSpecifier(
              identifier(canonicalName.name),
              identifier(canonicalName.name)
            ),
          ],
          stringLiteral(canonicalName.uri)
        ),
        references: Map(),
      });
    } else {
      return getDefinitionFromExternalURI(canonicalName);
    }
  }
);
