import traverse, { NodePath } from '@babel/traverse';
import {
  VariableDeclarator,
  Program,
  Identifier,
  isStatement,
} from '@babel/types';
import { bundlePath } from './bundlePath';
import { parseSync } from '@babel/core';
import { tuple } from '@deaven/tuple';

describe(bundlePath, () => {
  test('should bundle a file scoped binding', () => {
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

    expect(bundlePath(pathToBundle!, programPath!)).toMatchSnapshot();
  });

  test('should bundle variable declarations', () => {
    const code = `
      const b = 1;
      const c = b;
		`;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'c');

    expect(bundlePath(pathToBundle!, programPath!)).toMatchSnapshot();
  });

  test('should bundle identifier', () => {
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

    expect(bundlePath(pathToBundle!, programPath!)).toMatchSnapshot();
  });

  test('should throw an error on undeclared reference', () => {
    const code = `
      const b = 6;
      const c = a;
    `;

    const [
      pathToBundle,
      programPath,
    ] = extractPathToBundleAndProgramPathFromCode(code, 'c');

    expect(() => bundlePath(pathToBundle!, programPath!)).toThrowError();
  });

  test('should throw an error on a reference to a non program scoped binding', () => {
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

    expect(() => bundlePath(pathToBundle!, programPath!)).toThrowError();
  });

  describe('builtin modules', () => {
    test('importing the console module', () => {
      const code = `
				import * as console from "console";

				const b = console;
			`;

      const [
        pathToBundle,
        programPath,
      ] = extractPathToBundleAndProgramPathFromCode(code, 'b');

      expect(bundlePath(pathToBundle!, programPath!)).toMatchSnapshot();
    });
  });
});

function extractPathToBundleAndProgramPathFromCode(
  code: string,
  identifier: string
) {
  const ast = parseSync(code, {
    filename: 'a.ts',
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
