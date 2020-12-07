import { CanonicalName } from '../../CanonicalName';
import { Definition } from '../../Definition';
import { Map } from 'immutable';

export type MacroFunction = (
  ...args: Definition[]
) => Definition | [Definition, Map<CanonicalName, Definition>];
