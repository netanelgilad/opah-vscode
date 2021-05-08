// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { createWriteStream, unlinkSync, writeFileSync } from "fs";
import { mkdirp, pathExists } from "fs-extra";
import got from "got";
import { homedir } from "os";
import { dirname, join } from "path";
import { pipeline } from "stream";
import { URL } from "url";
import { promisify } from "util";
import * as vscode from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(_context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "opah" is now active!');

  const remotesDir = join(homedir(), ".opah/remotes");
  const remotes = vscode.workspace
    .getConfiguration("opah")
    .get<string[]>("remotes");

  if (remotes) {
    const remotesLockDir = "/tmp/opah-remotes-locks";
    await mkdirp(remotesLockDir);
    for (const remote of remotes) {
      const asURL = new URL(remote);
      const remotePath = join(asURL.hostname, asURL.pathname);
      const remotePathOnLocalFS = join(remotesDir, remotePath);
      if (!(await pathExists(remotePathOnLocalFS))) {
        await withLock(remotePathOnLocalFS, remotesLockDir, async () => {
          if (!(await pathExists(remotePathOnLocalFS))) {
            await mkdirp(dirname(remotePathOnLocalFS))
            await promisify(pipeline)(
              got.stream(remote),
              createWriteStream(remotePathOnLocalFS)
            )
          }
        });
      }
    }
  }

  vscode.window.showInformationMessage(
    remotes ? remotes.join("\n") : "no remotes"
  );
}

async function lock(path: string, locksDir: string) {
  return new Promise<void>((resolve, reject) => {
    try {
      writeFileSync(
        `${join(locksDir, path.replace(/\//g, "_"))}.lock`,
        "locked",
        {
          flag: "ax",
        }
      );
      resolve();
    } catch (err) {
      if (err.code === "EEXIST") {
        setTimeout(async () => {
          await lock(path, locksDir);
          resolve();
        }, 3000);
      } else {
        reject(err);
      }
    }
  });
}

async function withLock<T>(
  path: string,
  locksDir: string,
  cb: () => Promise<T>
) {
  await lock(path, locksDir);

  try {
    return cb();
  } finally {
    unlock(path, locksDir);
  }
}

function unlock(path: string, locksDir: string) {
  unlinkSync(`${join(locksDir, path.replace(/\//g, "_"))}.lock`);
}

// this method is called when your extension is deactivated
export function deactivate() {}
