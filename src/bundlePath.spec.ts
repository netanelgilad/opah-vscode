import traverse, { NodePath } from '@babel/traverse';
import {
  VariableDeclarator,
  Program,
  Identifier,
  VariableDeclaration,
} from '@babel/types';
import { bundlePath } from './bundlePath';
import { parseSync, transformFromAstSync } from '@babel/core';

describe(bundlePath, () => {
  test('should bundle a file scoped binding', () => {
    const code = `
      function a() {

      }
      const b = 6;
      const c = a;
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
      VariableDeclaration: function(path) {
        if (
          ((path.get('declarations.0') as NodePath<VariableDeclarator>).node
            .id as Identifier).name === 'c'
        ) {
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

    const ast = parseSync(code, {
      filename: 'a.ts',
    })!;

    let pathToBundle: NodePath;
    let programPath: NodePath<Program>;
    transformFromAstSync(ast, '', {
      filename: 'a.ts',
      presets: [
        '@babel/preset-typescript',
        [
          '@babel/preset-env',
          {
            targets: ['current node'],
          },
        ],
      ],
      plugins: [
        () => ({
          visitor: {
            Program: (path: NodePath<Program>) => {
              programPath = path;
            },
            VariableDeclaration: (path: NodePath<VariableDeclaration>) => {
              if (
                ((path.get('declarations.0') as NodePath<VariableDeclarator>)
                  .node.id as Identifier).name === 'c'
              ) {
                pathToBundle = path;
              }
            },
          },
        }),
      ],
    });

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

    const ast = parseSync(code, {
      filename: 'a.ts',
    })!;

    let pathToBundle: NodePath;
    let programPath: NodePath<Program>;
    transformFromAstSync(ast, '', {
      filename: 'a.ts',
      presets: [
        '@babel/preset-typescript',
        [
          '@babel/preset-env',
          {
            targets: ['current node'],
          },
        ],
      ],
      plugins: [
        () => ({
          visitor: {
            Program: (path: NodePath<Program>) => {
              programPath = path;
            },
            VariableDeclaration: (path: NodePath<VariableDeclaration>) => {
              if (
                ((path.get('declarations.0') as NodePath<VariableDeclarator>)
                  .node.id as Identifier).name === 'h'
              ) {
                pathToBundle = path;
              }
            },
          },
        }),
      ],
    });

    expect(() => bundlePath(pathToBundle!, programPath!)).toThrowError();
  });
});
