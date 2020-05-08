import traverse, { NodePath } from '@babel/traverse';
import {
  VariableDeclarator,
  Program,
  Identifier,
  isStatement,
} from '@babel/types';
import { bundlePath } from './bundlePath';
import { parseSync, transformSync } from '@babel/core';
import { tuple } from '@deaven/tuple';
import { globals } from './globals';

describe(bundlePath, () => {
  test('should bundle a file scoped binding', async () => {
    const code = `
      function a() {

      }
      const b = 6;
      const c = a;
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'c');

    expect(
      await bundlePath(pathToBundle!, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(`"function a() {}\\\\n\\\\nconst c = a;"`);
  });

  test('should bundle variable declarations', async () => {
    const code = `
      const b = 1;
      const c = b;
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'c');

    expect(
      await bundlePath(pathToBundle!, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(`"const b = 1;\\\\nconst c = b;"`);
  });

  test('should bundle transitive variable declarations', async () => {
    const code = `
		  const a = 1;
      const b = a;
      const c = b;
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'c');

    expect(
      await bundlePath(pathToBundle!, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(`"const a = 1;\\\\nconst b = a;\\\\nconst c = b;"`);
  });

  test('should bundle identifier', async () => {
    const code = `
      const b = 1;
      b
		`;

    const ast = parseSync(code, {
      filename: 'a.ts',
    })!;

    let pathToBundle: NodePath;
    let programPath: NodePath<Program>;
    traverse(ast, {
      Program: path => {
        programPath = path;
      },
      Identifier: function(path) {
        if (isStatement(path.parentPath.node)) {
          pathToBundle = path;
        }
      },
    });

    expect(
      await bundlePath(pathToBundle!, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(`"const b = 1;\\\\nb;"`);
  });

  test('should throw an error on undeclared reference', async () => {
    const code = `
      const b = 6;
      const c = a;
    `;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'c');

    await expect(
      bundlePath(pathToBundle!, programPath!, '/a.ts')
    ).rejects.toThrowError();
  });

  test('should throw an error on a reference to a non program scoped binding', async () => {
    const code = `
      const b = 6;
      const c = a;

      function d() {
        const e = 6;
        function f() {
          const h = e;
        }
      }
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'h');

    await expect(
      bundlePath(pathToBundle!, programPath!, '/a.ts')
    ).rejects.toThrowError();
  });

  test('bundle a function declartion dependencies ', async () => {
    const code = `
			const c = 1;

			function a() {
				return c;
			}

			const b = a();
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'b');

    expect(
      await bundlePath(pathToBundle!, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(
      `"const c = 1;\\\\n\\\\nfunction a() {\\\\n  return c;\\\\n}\\\\n\\\\nconst b = a();"`
    );
  });

  describe('builtin modules', () => {
    test('importing the console module', async () => {
      const code = `
				import { console } from "console";

				const b = console;
			`;

      const [
        pathToBundle,
        programPath,
      ] = extractPathToBundleAndProgramPathFromCode(code, 'b');

      expect(
        await bundlePath(pathToBundle!, programPath!, '/a.ts')
      ).toMatchInlineSnapshot(`"const b = console;"`);
    });
  });

  describe('globals', () => {
    test.each(globals.map(x => [x]))(
      'should allow bundling "%s"',
      async global => {
        const code = `
				const b = ${global};
			`;

        const [
          pathToBundle,
          programPath,
        ] = extractPathToBundleAndProgramPathFromCode(code, 'b');

        expect(
          await bundlePath(pathToBundle!, programPath!, '/a.ts')
        ).toMatchInlineSnapshot(`"const b = ${global};"`);
      }
    );
  });
});

function extractPathToBundleAndProgramPathFromCode(
  code: string,
  identifier: string
) {
  const { ast } = transformSync(code, {
    filename: 'a.ts',
    ast: true,
    code: false,
    presets: [
      require('@babel/preset-typescript'),
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current',
          },
          modules: false,
        },
      ],
    ],
  })!;

  let pathToBundle: NodePath;
  let programPath: NodePath<Program>;
  traverse(ast, {
    Program: path => {
      programPath = path;
    },
    VariableDeclaration: function(path) {
      if (
        ((path.get('declarations.0') as NodePath<VariableDeclarator>).node
          .id as Identifier).name === identifier
      ) {
        pathToBundle = path;
      }
    },
  });

  return tuple(pathToBundle, programPath);
}
