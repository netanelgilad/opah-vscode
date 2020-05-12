import { isChildScope } from './isChildScope';
import traverse, { Scope } from '@babel/traverse';
import { parse } from '@babel/parser';

describe(isChildScope, () => {
  test('should return true when first argument is a child scope of the second argument', () => {
    const program = `
      function c() {
        ThisIsAScope
      }
    `;

    const ast = parse(program);

    let childScope: Scope;
    let parentScope: Scope;

    traverse(ast, {
      Program: path => {
        parentScope = path.scope;
      },
      Identifier: path => {
        if (path.node.name === 'ThisIsAScope') {
          childScope = path.scope;
        }
      },
    });

    expect(isChildScope(childScope!, parentScope!)).toBe(true);
  });

  test('should return false when the first argument is not a child scope of the second argument', () => {
    const program = `
      function c() {
        ThisIsAScope
      }
    `;

    const ast = parse(program);

    let childScope: Scope;
    let parentScope: Scope;

    traverse(ast, {
      Program: path => {
        parentScope = path.scope;
      },
      Identifier: path => {
        if (path.node.name === 'ThisIsAScope') {
          childScope = path.scope;
        }
      },
    });

    expect(isChildScope(parentScope!, childScope!)).toBe(false);
  });

  test('should return true when the first scope is the same as the second scope', () => {
    const program = `
      console.log('a');
    `;

    const ast = parse(program);

    let scope: Scope;

    traverse(ast, {
      Program: path => {
        scope = path.scope;
      },
    });

    expect(isChildScope(scope!, scope!)).toBe(true);
  });
});
