import traverse, { NodePath } from '@babel/traverse';
import {
  VariableDeclarator,
  Program,
  Identifier,
  isStatement,
  Node,
} from '@babel/types';
import { bundlePath } from './bundlePath';
import { parseSync, transformSync } from '@babel/core';
import { tuple } from '@deaven/tuple';
import { globals } from './globals';
import { bundleCanonicalName } from './bundleCanonicalName';
import { fixtureFile } from '../test/fixtureFile';
import { statefulTest } from '../test/statefulTest';
import { assertThat } from '../test/assertThat';
import { canonicalIdentifier } from './fullyQualifiedIdentifier';
import { getASTFromCode } from './getASTFromCode';
import { assertion } from '../test/assertions/Assertion';

const hasTheseDefinitions = (expected: Array<[string, Node]>) =>
  assertion((expect, actual) => {});

describe(bundleCanonicalName, () => {
  statefulTest.only('should bundle a file scoped binding', async function*() {
    const tmpFilePath = yield* fixtureFile(`
			function a() {

      }
      const b = 6;
      const c = a;
      `);

    const bundle = await bundleCanonicalName({ uri: tmpFilePath, name: 'c' });

    expect(Array.from(bundle.definitions.entries())).toEqual([
      [
        canonicalIdentifier({ name: 'a', uri: tmpFilePath }),
        (await getASTFromCode('function a() {}', tmpFilePath))!.program.body[0],
      ],
      [
        canonicalIdentifier({ name: 'b', uri: tmpFilePath }),
        (await getASTFromCode('const b = 6', tmpFilePath))!.program.body[0],
      ],
      [
        canonicalIdentifier({ name: 'c', uri: tmpFilePath }),
        (await getASTFromCode('const c = a', tmpFilePath))!.program.body[0],
      ],
    ]);

    // assertThat(
    //   bundle,
    //   hasTheseDefinitions()
    // );
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
      await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(
      `"\\"use strict\\";\\\\n\\\\nconst _a_ts_b = 1;\\\\nconst c = _a_ts_b;"`
    );
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
      await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(
      `"\\"use strict\\";\\\\n\\\\nconst _a_ts_a = 1;\\\\nconst _a_ts_b = _a_ts_a;\\\\nconst c = _a_ts_b;"`
    );
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
      await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(
      `"\\"use strict\\";\\\\n\\\\nconst _a_ts_b = 1;\\\\nb;"`
    );
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
      bundlePath(pathToBundle!, true, programPath!, '/a.ts')
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
      bundlePath(pathToBundle!, true, programPath!, '/a.ts')
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
      await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(
      `"\\"use strict\\";\\\\n\\\\nconst _a_ts_c = 1;\\\\n\\\\nfunction _a_ts_a() {\\\\n  return _a_ts_c;\\\\n}\\\\n\\\\nconst b = _a_ts_a();"`
    );
  });

  test('should not bundle the same definition more than once', async () => {
    const code = `
			const c = 1;

			function d() {
				return c;
			}

			function a() {
				return c + d();
			}

			const b = a();
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'b');

    expect(
      await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(
      `"\\"use strict\\";\\\\n\\\\nconst _a_ts_c = 1;\\\\n\\\\nfunction _a_ts_d() {\\\\n  return _a_ts_c;\\\\n}\\\\n\\\\nfunction _a_ts_a() {\\\\n  return _a_ts_c + _a_ts_d();\\\\n}\\\\n\\\\nconst b = _a_ts_a();"`
    );
  });

  test('should not bundle the same import definition from a builtin module more than once', async () => {
    const code = `
		  import { createServer } from "http";

			function d() {
				return createServer;
			}

			function a() {
				return [createServer, d()];
			}

			const b = a();
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'b');

    expect(
      await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
    ).toMatchInlineSnapshot(
      `"\\"use strict\\";\\\\n\\\\nvar _http = require(\\"http\\");\\\\n\\\\nfunction _a_ts_d() {\\\\n  return _http.createServer;\\\\n}\\\\n\\\\nfunction _a_ts_a() {\\\\n  return [_http.createServer, _a_ts_d()];\\\\n}\\\\n\\\\nconst b = _a_ts_a();"`
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
        await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
      ).toMatchInlineSnapshot(
        `"\\"use strict\\";\\\\n\\\\nconst console_console = console;\\\\nconst b = console_console;"`
      );
    });

    test('should bundle two imports from the same builtin module', async () => {
      const code = `
				import { createServer, request } from "http";

				const b = [createServer, request];
			`;

      const [
        pathToBundle,
        programPath,
      ] = extractPathToBundleAndProgramPathFromCode(code, 'b');

      expect(
        await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
      ).toMatchInlineSnapshot(
        `"\\"use strict\\";\\\\n\\\\nvar _http = require(\\"http\\");\\\\n\\\\nconst b = [_http.createServer, _http.request];"`
      );
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
          await bundlePath(pathToBundle!, true, programPath!, '/a.ts')
        ).toEqual(`"use strict\";\\n\\nconst b = ${global};`);
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
