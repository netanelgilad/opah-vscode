import { MacroFunction } from './MacroFunction';

export * from '@babel/types';
export { buildExecutable } from './buildExecutable';
export { CanonicalName } from './CanonicalName';
export { Closure } from './Closure';
export { Definition } from './Definition';
export { getASTFromCode } from './getASTFromCode';
export { getBindingsStatementsFromFileAST } from './getBindingsStatementsFromFileAST';
export { getOutOfScopeReferences } from './getOutOfScopeReferences';
export { replaceReferencesToCanonicalReferences } from './repalceReferencesToCanonicalNames';
export { replaceNodesByType } from './replaceNodesByType';
export declare function createMacro<TArgs extends any[], TReturn>(fn: MacroFunction<TArgs, TReturn>): (...args: TArgs) => TReturn;

