function createStatefulTestFunction(
  testFn: (
    description: string,
    fn: () => Promise<any> | undefined,
    timeout?: number
  ) => void
) {
  return function statefulTest(
    description: string,
    fn: () => AsyncGenerator<any, unknown, any>,
    timeout?: number
  ) {
    const cleanups = [] as (() => unknown)[];
    testFn(
      description,
      async () => {
        try {
          for await (const cleanup of fn()) {
            cleanups.push(cleanup);
          }
        } finally {
          for (const clean of cleanups) {
            await clean();
          }
        }
      },
      timeout
    );
  };
}

const statefulTestFn = createStatefulTestFunction(it);
// @ts-ignore
statefulTestFn.only = createStatefulTestFunction(it.only);

export type TStatefulTest = {
  (
    description: string,
    fn: () => AsyncGenerator<any, unknown, any>,
    timeout?: number
  ): void;
  only: (
    description: string,
    fn: () => AsyncGenerator<any, unknown, any>,
    timeout?: number
  ) => void;
};

export const statefulTest = statefulTestFn as TStatefulTest;
