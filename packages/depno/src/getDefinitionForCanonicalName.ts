import {
  nullLiteral
} from '@babel/types';
import { Map } from 'immutable';
import { CanonicalName } from './CanonicalName';
import { Definition } from './Definition';
import { depnoAPIsURIs } from './depnoAPIsURIs';
import { getDefinitionFromExternalURI } from './getExecutionCodeForDefinition/getDefinitionFromExternalURI';
import { withCache } from './getExecutionCodeForDefinition/withCache';

export const getDefinitionForCanonicalName = withCache(
  async (canonicalName: CanonicalName) => {
    if (depnoAPIsURIs.includes(canonicalName.uri)) {
      return Definition({
        expression: nullLiteral(),
        references: Map(),
      });
    } else {
      return getDefinitionFromExternalURI(canonicalName);
    }
  }
);
