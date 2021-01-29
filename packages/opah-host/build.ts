/// <reference path="./external-types.d.ts" />

import ncc from "@vercel/ncc";
import { dirname, join } from "path";
import { copy, outputFile } from "fs-extra";

async function main() {
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
