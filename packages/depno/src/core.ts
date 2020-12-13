import { MacroFunction } from './MacroFunction';

export { Definition } from './Definition';
export { CanonicalName } from './CanonicalName';
export { executeDefinitionInContext } from './executeDefinitionInContext';
export { getDefinitionForCanonicalName } from './getDefinitionForCanonicalName';
export * from '@babel/types';
export declare function createMacro<T>(fn: MacroFunction): T;
