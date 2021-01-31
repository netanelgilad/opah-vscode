declare module "@opah/core" {
  import { CanonicalName } from "opah-host/src/CanonicalName";
  import { Definition } from "opah-host/src/Definition";
  import { Map } from "@opah/immutable";
  import { Closure } from "opah-host/src/Closure";

  type MaybePromise<T> = T | Promise<T>;

  type MapToClosure<T> = { [K in keyof T]: Closure<T[K]> };

  export type MacroFunction<
    T extends any[] = unknown[],
    TReturn extends any = unknown
  > = (
    ...args: MapToClosure<T>
  ) => MaybePromise<
    Closure<TReturn> | [Closure<TReturn>, Map<CanonicalName, Definition>]
  >;

  export function createMacro<TArgs extends any[], TReturn>(
    fn: MacroFunction<TArgs, TReturn>
  ): (...args: TArgs) => TReturn;
  export * from "opah-host/core";
}
