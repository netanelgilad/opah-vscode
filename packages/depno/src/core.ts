import { MacroFunction } from './MacroFunction';

export { Definition } from './Definition';
export { CanonicalName } from './CanonicalName';
export { Closure } from './Closure';
export * from '@babel/types';
export declare function createMacro<T>(fn: MacroFunction): T;
export { getASTFromCode } from './getASTFromCode';
export { getBindingsStatementsFromFileAST } from './getBindingsStatementsFromFileAST';
export { getOutOfScopeReferences } from './getOutOfScopeReferences';
export { replaceNodesByType } from './replaceNodesByType';
export { replaceReferencesToCanonicalReferences } from './repalceReferencesToCanonicalNames';
