import { spawn } from "child_process";

async function runCommand(
  command: string,
  opts: {
    cwd: string;
  }
) {
  const commandParts = command.split(" ");
  const childProcess = spawn(commandParts[0], commandParts.slice(1), {
    ...opts,
    stdio: "inherit",
    shell: true,
  });

  await new Promise((resolve) => childProcess.on("exit", resolve));
}

export async function publishExtension() {
  await runCommand("yarn publish --patch --no-git-tag-version", {
    cwd: "./packages/opah-typescript-plugin",
  });

  await runCommand(
    "yarn upgrade --latest opah-typescript-plugin && yarn version --patch --no-git-tag-version && vsce publish",
    {
      cwd: "./packages/opah-vscode",
    }
  );
}

function getModuleWithQueryString(moduleName: string): string | undefined {
  let name = moduleName;
  for (
    const index = name.indexOf("?");
    index !== -1;
    name = name.substring(index + 1)
  ) {
    const sub = name.substring(0, index);
    if (sub.endsWith(".ts") || sub.endsWith(".tsx")) {
      const cutLength = moduleName.length - name.length;
      return moduleName.substring(0, index + cutLength) || undefined;
    }
  }
  return undefined;
}

function stripExtNameDotTs(moduleName: string): string {
  const moduleWithQuery = getModuleWithQueryString(moduleName);
  if (moduleWithQuery) {
    return moduleWithQuery;
  }
  const next = moduleName.replace(/\.tsx?$/, "");
  return next;
}

export default () => {
  console.log(stripExtNameDotTs('https://raw.githubusercontent.com/netanelgilad/opah-shell/main/validator/scenario.ts'))
}