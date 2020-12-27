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

const depnoAPIsToRequireMap = Map(
  builtinModules
    .map(x => [x, x] as [string, string])
    .concat([
      ['@depno/core', require.resolve('./core')] as [string, string],
      ['@depno/host', require.resolve('./host')] as [string, string],
      ['@depno/immutable', require.resolve('immutable')] as [string, string],
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
                        depnoAPIsToRequireMap.get(path.node.source!.value)!
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
