function createStatefulTestFunction(
  testFn: (description: string, fn: () => Promise<any> | undefined) => void
) {
  return function statefulTest(
    description: string,
    fn: () => AsyncGenerator<any, unknown, any>
  ) {
    const cleanups = [] as (() => unknown)[];
    testFn(description, async () => {
      try {
        for await (const cleanup of fn()) {
          cleanups.push(cleanup);
        }
      } finally {
        for (const clean of cleanups) {
          await clean();
        }
      }
    });
  };
}

const statefulTestFn = createStatefulTestFunction(it);
// @ts-ignore
statefulTestFn.only = createStatefulTestFunction(it.only);

export type TStatefulTest = {
  (description: string, fn: () => AsyncGenerator<any, unknown, any>): void;
  only: (
    description: string,
    fn: () => AsyncGenerator<any, unknown, any>
  ) => void;
};

export const statefulTest = statefulTestFn as TStatefulTest;
