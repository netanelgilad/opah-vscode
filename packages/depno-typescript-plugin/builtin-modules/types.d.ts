declare module "types" {
  export interface Dict<T> {
    [key: string]: T | undefined;
  }

  export interface ReadOnlyDict<T> {
    readonly [key: string]: T | undefined;
  }
}
