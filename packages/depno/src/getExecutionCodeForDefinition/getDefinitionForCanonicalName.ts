import {
  callExpression,
  identifier,
  memberExpression,
  stringLiteral,
} from '@babel/types';
import { Map } from 'immutable';
import { CanonicalName } from '../CanonicalName';
import { Definition } from '../Definition';
import { nodeModules } from './nodeModules';
import { getDefinitionFromExternalURI } from './getDefinitionFromExternalURI';
import { withCache } from './withCache';

export const getDefinitionForCanonicalName = withCache(
  async (canonicalName: CanonicalName) => {
    if (nodeModules.includes(canonicalName.uri)) {
      return Definition({
        expression: memberExpression(
          callExpression(identifier('require'), [
            stringLiteral(canonicalName.uri),
          ]),
          identifier(canonicalName.name)
        ),
        references: Map(),
      });
    } else if (canonicalName.uri === 'console') {
      return Definition({
        expression: identifier('console'),
        references: Map(),
      });
    } else if (canonicalName.uri === '@depno/core') {
      return Definition({
        expression: memberExpression(
          callExpression(identifier('require'), [
            stringLiteral(require.resolve('../core')),
          ]),
          identifier(canonicalName.name)
        ),
        references: Map(),
      });
    } else if (canonicalName.uri === '@depno/immutable') {
      return Definition({
        expression: memberExpression(
          callExpression(identifier('require'), [
            stringLiteral(require.resolve('immutable')),
          ]),
          identifier(canonicalName.name)
        ),
        references: Map(),
      });
    } else {
      return getDefinitionFromExternalURI(canonicalName);
    }
  }
);
