/// <reference path="./external-types.d.ts" />

import ncc from "@vercel/ncc";
import { dirname, join } from "path";
import { copy, outputFile, remove } from "fs-extra";
import { command } from "execa";

async function main() {
  await remove('./dist');

  await outputFile(
    "./dist/core/index.js",
    (await ncc(join(__dirname, "./src/core.ts"))).code
  );
  await outputFile(
    "./dist/host/index.js",
    (await ncc(join(__dirname, "./src/host.ts"))).code
  );
  await outputFile(
    "./dist/immutable/index.js",
    (await ncc(join(__dirname, "./src/immutable.ts"))).code
  );

  const pkgPath = dirname(require.resolve("pkg/package.json"));
  await copy(
    join(pkgPath, "./prelude/bootstrap.js"),
    "./dist/core/bootstrap.js"
  );
  await copy(join(pkgPath, "./prelude/common.js"), "./dist/core/common.js");

  await command(`yarn tsc -p tsconfig-types.json`)
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
