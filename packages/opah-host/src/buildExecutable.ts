/// <reference path="../external-types.d.ts" />

import { Program } from "@babel/types";
import { writeFileSync } from "fs";
import { copy, outputFile } from "fs-extra";
import { join } from "path";
import { exec } from "pkg";
import { directory } from "tempy";
import {
  CoreModulesLocations,
  getCodeFromExecutionProgram
} from "./getCodeFromExecutionProgram";

export async function buildExecutable(
  program: Program,
  coreModulesLocations: CoreModulesLocations,
  options: {
    target: "host";
    output: string;
  }
) {
  const tmpDir = directory();
  await copy(coreModulesLocations["@opah/core"], join(tmpDir, "core"));
  await outputFile(join(tmpDir, "dictionary/.keep"), '');
  await copy(coreModulesLocations["@opah/host"], join(tmpDir, "host"));
  await copy(
    coreModulesLocations["@opah/immutable"],
    join(tmpDir, "immutable")
  );
  writeFileSync(
    join(tmpDir, "pkg.config.json"),
    JSON.stringify({
      assets: ["./core/bootstrap.js", "./core/common.js", './dictionary'],
    })
  );

  const code = await getCodeFromExecutionProgram(program, {
    "@opah/core": "./core",
    "@opah/host": "./host",
    "@opah/immutable": "./immutable",
  });

  writeFileSync(join(tmpDir, "index.js"), code);

  await exec([
    join(tmpDir, "index.js"),
    "--config",
    join(tmpDir, "pkg.config.json"),
    "--target",
    options.target,
    "--output",
    options.output,
  ]);
}
