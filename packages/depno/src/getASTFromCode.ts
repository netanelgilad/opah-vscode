import { transformAsync } from '@babel/core';

export async function getASTFromCode(code: string, filename: string) {
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

  return ast;
}
