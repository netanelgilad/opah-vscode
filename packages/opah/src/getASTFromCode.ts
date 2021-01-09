import { transformAsync } from '@babel/core';
import { File } from '@babel/types';
import { Map } from 'immutable';

export type ASTStore = Map<string, File>;

export async function getASTFromCode(
  astStore: ASTStore,
  code: string,
  filename: string
): Promise<[ASTStore, File]> {
  const existing = astStore.get(code);
  if (!existing) {
    const { ast } = (await transformAsync(code, {
      filename,
      ast: true,
      presets: [
        require('@babel/preset-typescript'),
        [
          require('@babel/preset-env'),
          {
            targets: {
              node: 'current',
            },
            modules: false,
          },
        ],
      ],
    }))!;

    return [astStore.set(code, ast!), ast!];
  } else {
    return [astStore, existing];
  }
}
