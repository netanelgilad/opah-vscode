import { NodePath, transformFromAstSync } from "@babel/core";
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
} from "@babel/types";

export type CoreModulesLocations = {
  "@opah/core": string;
  "@opah/host": string;
  "@opah/immutable": string;
}

export function getCodeFromExecutionProgram(
  program: Program,
  coreModulesLocations: CoreModulesLocations = {
    "@opah/core": require.resolve('../core'),
    "@opah/host": require.resolve('../host'),
    "@opah/immutable": require.resolve('../immutable'),
  }
) {
  const { code } = transformFromAstSync(program, undefined, {
    plugins: [
      () => ({
        visitor: {
          ImportDeclaration(path: NodePath<ImportDeclaration>) {
            path.replaceWith(
              variableDeclaration("const", [
                variableDeclarator(
                  path.node.specifiers[0].local,
                  memberExpression(
                    callExpression(identifier("require"), [
                      stringLiteral(
                        path.node.source!.value === "@opah/core" ||
                          path.node.source!.value === "@opah/host" ||
                          path.node.source!.value === "@opah/immutable"
                          ? coreModulesLocations[path.node.source!.value]
                          : path.node.source!.value
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
  return code!;
}
