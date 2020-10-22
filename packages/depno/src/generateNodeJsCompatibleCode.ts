import { transformFromAstAsync } from '@babel/core';
import { File } from '@babel/types';
import jsesc from 'jsesc';

export async function generateNodeJsCompatibleCode(
  ast: File,
  currentURI?: string
) {
  const { code } = (await transformFromAstAsync(ast, undefined, {
    code: true,
    filename: currentURI || 'a.ts',
    plugins: [require('@babel/plugin-transform-modules-commonjs')],
  }))!;

  return code;
  return jsesc(code!, { quotes: 'backtick' });
}
