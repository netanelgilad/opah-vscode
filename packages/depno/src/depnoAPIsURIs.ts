import { builtinModules } from "module";

export const depnoAPIsURIs = [
    ...builtinModules,
    "@depno/core",
    "@depno/host",
    "@depno/immutable",
  ];