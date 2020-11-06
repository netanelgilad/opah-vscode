import { NodePath, transformFromAstAsync } from '@babel/core';
import { ExpressionStatement, Identifier, program } from '@babel/types';
import { CaononicalDefinitionNode } from './Bundle';

export async function transformReferencesInNode(
  node: ExpressionStatement,
  transformer: (referencePath: NodePath<Identifier>) => unknown
): Promise<ExpressionStatement>;
export async function transformReferencesInNode(
  node: CaononicalDefinitionNode,
  transformer: (referencePath: NodePath<Identifier>) => unknown
): Promise<CaononicalDefinitionNode>;
export async function transformReferencesInNode(
  node: ExpressionStatement | CaononicalDefinitionNode,
  transformer: (referencePath: NodePath<Identifier>) => unknown
): Promise<ExpressionStatement | CaononicalDefinitionNode>;
export async function transformReferencesInNode(
  node: ExpressionStatement | CaononicalDefinitionNode,
  transformer: (referencePath: NodePath<Identifier>) => unknown
): Promise<ExpressionStatement | CaononicalDefinitionNode> {
  const { ast } = (await transformFromAstAsync(program([node]), undefined, {
    filename: 'a.ts',
    code: false,
    ast: true,
    plugins: [
      () => ({
        visitor: {
          // @ts-ignore
          ReferencedIdentifier(referencePath: NodePath<Identifier>) {
            const binding = referencePath.scope.getBinding(
              referencePath.node.name
            );
            if (!binding) {
              transformer(referencePath);
            }
          },
        },
      }),
    ],
  }))!;

  const statement = ast!.program.body[0];

  return statement as ExpressionStatement | CaononicalDefinitionNode;
}
