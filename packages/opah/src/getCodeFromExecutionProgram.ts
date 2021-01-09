import { NodePath, transformFromAstSync } from '@babel/core';
import {
    callExpression,
    identifier,
    ImportDeclaration,
    ImportSpecifier,
    memberExpression,
    Program,
    stringLiteral,
    variableDeclaration,
    variableDeclarator
} from '@babel/types';
import { Map } from 'immutable';
import { builtinModules } from 'module';

const opahAPIsToRequireMap = Map(
  builtinModules
    .map(x => [x, x] as [string, string])
    .concat([
      ['@opah/core', require.resolve('./core')] as [string, string],
      ['@opah/host', require.resolve('./host')] as [string, string],
      ['@opah/immutable', require.resolve('immutable')] as [string, string],
    ])
);

export function getCodeFromExecutionProgram(program: Program) {
  const { code } = transformFromAstSync(program, undefined, {
    plugins: [
      () => ({
        visitor: {
          ImportDeclaration(path: NodePath<ImportDeclaration>) {
            path.replaceWith(
              variableDeclaration('const', [
                variableDeclarator(
                  path.node.specifiers[0].local,
                  memberExpression(
                    callExpression(identifier('require'), [
                      stringLiteral(
                        opahAPIsToRequireMap.get(path.node.source!.value)!
                      ),
                    ]),
                    (path.node.specifiers[0] as ImportSpecifier).imported
                  )
                ),
              ])
            );
          },
        },
      }),
    ],
  })!;
  return code;
}
