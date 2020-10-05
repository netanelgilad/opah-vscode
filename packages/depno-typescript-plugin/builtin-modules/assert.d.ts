declare module "assert" {
  export const strict: {
    strictEqual(actual: any, expected: any, message?: string | Error): void;
    ok(value: any, message?: string | Error): void;
  };
}
