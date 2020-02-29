import { functionMacro } from './functionMacro';
import { Chance } from 'chance';

const chance = new Chance();

function randomDataSet() {
  return new Array(chance.natural({ min: 10, max: 15 }))
    .fill(0)
    .map(() => chance.string());
}

describe(functionMacro, () => {
  test('should replace with the result of given function', () => {
    const expectedArgs = randomDataSet();
    const expectedToReplace = chance.string();
    const expectedContext = {
      reference: {
        parentPath: {
          replaceWith(toReplace: unknown) {
            expect(toReplace).toBe(expectedToReplace);
          },
          node: {
            arguments: expectedArgs,
          },
        },
      },
    };
    const macro = functionMacro((context, ...args) => {
      expect(context).toBe(expectedContext);
      expect(args).toEqual(expectedArgs);
      return expectedToReplace;
    });

    macro(expectedContext as any);
  });
});
