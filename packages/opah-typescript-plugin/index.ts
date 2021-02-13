import { dirname, join, resolve } from "path";
import merge = require("merge-deep");
import { homedir } from "os";

function init(modules: {
  typescript: typeof import("typescript/lib/tsserverlibrary");
}) {
  const ts = modules.typescript;

  const nodeTypesPath = dirname(require.resolve("@types/node/package.json"));
  const immutableTypesPath = join(
    dirname(require.resolve("immutable/package.json")),
    "dist/immutable-nonambient.d"
  );
  const immutableJSPath = join(
    dirname(require.resolve("immutable/package.json")),
    "dist/immutable.js"
  );

  const OPTIONS: ts.CompilerOptions = {
    esModuleInterop: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.React,
    noEmit: true,
    strict: true,
    removeComments: true,
    stripComments: true,
    resolveJsonModule: true,
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts"],
  };

  const OPTIONS_OVERWRITE_BY_DENO: ts.CompilerOptions = {
    jsx: OPTIONS.jsx,
    module: OPTIONS.module,
    moduleResolution: OPTIONS.moduleResolution,
    resolveJsonModule: OPTIONS.resolveJsonModule,
    strict: OPTIONS.strict,
    noEmit: OPTIONS.noEmit,
    noEmitHelpers: OPTIONS.noEmitHelpers,
    target: ts.ScriptTarget.ESNext,
    typeRoots: [],
    types: [
      nodeTypesPath,
      join(__dirname, "opah-core"),
      join(__dirname, "opah-host"),
    ],
    lib: ["lib.esnext.d.ts"],
  };

  function create(info: ts.server.PluginCreateInfo) {
    function log(message: any) {
      // info.project.projectService.logger.info(`opah: ${message}`);
    }

    const projectDirectory = info.project.getCurrentDirectory();
    // TypeScript plugins have a `cwd` of `/`, which causes issues with import resolution.
    process.chdir(projectDirectory);

    const virtualRemotesDir = join(projectDirectory, "opah-remotes");
    const realRemotesDir = join(homedir(), ".opah/remotes");
    const fakeTsConfigFilePath = join(__dirname, "./assets/tsconfig.json");
    const virtualTsConfigFilePath = join(projectDirectory, "tsconfig.json");

    // ref https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#customizing-module-resolution
    const resolveModuleNames = info.languageServiceHost.resolveModuleNames;

    if (resolveModuleNames === undefined) {
      log("resolveModuleNames is undefined.");
      return info.languageService;
    }

    info.languageServiceHost.resolveModuleNames = (
      moduleNames: string[],
      containingFile: string,
      _reusedNames?: string[],
      _redirectedReference?: ts.ResolvedProjectReference,
      options: ts.CompilerOptions = OPTIONS
    ) => {
      moduleNames = moduleNames.map((moduleName) =>
        moduleName.startsWith("https://")
          ? join(
              virtualRemotesDir,
              stripExtNameDotTs(moduleName.substr("https://".length))
            )
          : ["@opah/immutable", "immutable", immutableJSPath].includes(
              moduleName
            )
          ? immutableTypesPath
          : stripExtNameDotTs(moduleName)
      );

      return resolveModuleNames.call(
        info.languageServiceHost,
        moduleNames,
        containingFile,
        _reusedNames,
        _redirectedReference,
        options
      );
    };

    const getCompilationSettings =
      info.languageServiceHost.getCompilationSettings;

    info.languageServiceHost.getCompilationSettings = () => {
      const projectConfig = getCompilationSettings.call(
        info.languageServiceHost
      );
      const compilationSettings = merge(
        merge(OPTIONS, projectConfig),
        OPTIONS_OVERWRITE_BY_DENO
      );
      return compilationSettings;
    };

    const getCodeFixesAtPosition = info.languageService.getCodeFixesAtPosition;
    info.languageService.getCodeFixesAtPosition = (
      fileName: string,
      start: number,
      end: number,
      errorCodes: readonly number[],
      formatOptions: ts.FormatCodeSettings,
      preferences: ts.UserPreferences
    ) => {
      const fixes = getCodeFixesAtPosition.call(
        info.languageService,
        fileName,
        start,
        end,
        errorCodes,
        formatOptions,
        preferences
      );

      if (fixes && fixes.length > 0) {
        for (const fix of fixes) {
          if (fix.fixName === "import") {
            fix.description = fix.description.replace(
              /^(import .* from module ['"])(\..*)(['"])/i,
              "$1$2.ts$3"
            );
            fix.changes[0].textChanges[0].newText = fix.changes[0].textChanges[0].newText.replace(
              /^(import .* from ['"])(\..*)(['"];\n)/i,
              "$1$2.ts$3"
            );
          }
        }
      }

      return fixes;
    };

    const getCompletionEntryDetails =
      info.languageService.getCompletionEntryDetails;
    info.languageService.getCompletionEntryDetails = (
      fileName: string,
      position: number,
      name: string,
      formatOptions?: ts.FormatCodeOptions | ts.FormatCodeSettings,
      source?: string,
      preferences?: ts.UserPreferences
    ) => {
      const details = getCompletionEntryDetails.call(
        info.languageService,
        fileName,
        position,
        name,
        formatOptions,
        source,
        preferences
      );

      if (details) {
        if (details.codeActions && details.codeActions.length) {
          for (const ca of details.codeActions) {
            for (const change of ca.changes) {
              if (!change.isNewFile) {
                for (const tc of change.textChanges) {
                  const matches = /^(?<beforePath>import .* from ['"])(?<importPath>\..*)(?<afterPath>['"];\n)/i.exec(
                    tc.newText
                  );
                  if (matches) {
                    const {
                      beforePath,
                      importPath,
                      afterPath,
                    } = matches.groups!;
                    const targetImportPath = resolve(
                      dirname(fileName),
                      importPath
                    );
                    if (targetImportPath.startsWith(virtualRemotesDir)) {
                      tc.newText =
                        beforePath +
                        `https://${targetImportPath.substr(
                          virtualRemotesDir.length + 1
                        )}.ts` +
                        afterPath;
                    } else {
                      tc.newText = beforePath + `${importPath}.ts` + afterPath;
                    }
                  }
                }
              }
            }
          }
        }
      }

      return details;
    };

    [
      "readFile",
      "realpath",
      "getModifiedTime",
      "directoryExists",
      "fileExists",
      "readDirectory",
      "watchDirectory",
      "watchFile",
      "setModifiedTime",
      "deleteFile",
      "getDirectories",
      "resolvePath",
      "getFileSize",
    ].forEach((functionName) => {
      // @ts-ignore
      const origin = info.serverHost[functionName].bind(info.serverHost);
      // @ts-ignore
      info.serverHost[functionName] = (path: string, ...rest: any[]) => {
        if (path.toLowerCase() === virtualTsConfigFilePath.toLowerCase()) {
          if (functionName === "watchFile") {
            setTimeout(() => {
              rest[0](virtualTsConfigFilePath, ts.FileWatcherEventKind.Created);
            }, 0);
            return origin(
              fakeTsConfigFilePath,
              () => rest[0](virtualTsConfigFilePath),
              ...rest.slice(1)
            );
          }
          return origin(fakeTsConfigFilePath, ...rest);
        }
        if (path.toLowerCase().startsWith(virtualRemotesDir.toLowerCase())) {
          const realPath = join(
            realRemotesDir,
            path.substr(virtualRemotesDir.length)
          );
          if (functionName === "watchDirectory") {
            return origin(
              realPath,
              (filename: string) => {
                const replacedPath = join(
                  virtualRemotesDir,
                  filename.substr(realRemotesDir.length)
                );
                return rest[0](replacedPath);
              },
              ...rest.slice(1)
            );
          }
          return origin(realPath, ...rest);
        }

        const result = origin(path, ...rest);

        if (functionName === "getDirectories" && path === projectDirectory) {
          result.push("opah-remotes");
        }
        if (functionName === "readDirectory" && path === projectDirectory) {
          result.push(join(projectDirectory, "opah-remotes"));
        }
        return result;
      };
    });
  }

  return { create };
}

export = init;

function wrapLog(target: Function, log: (message: string) => void) {
  return (...args: any[]) => {
    log(`---> ${target.name} : ${args}`);
    const result = target(...args);
    log(`<--- ${target.name}: ${result}`);
    return result;
  };
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

function safeStringify(obj: any, indent = 2) {
  let cache: any[] = [];
  const retVal = JSON.stringify(
    obj,
    (key, value) =>
      typeof value === "object" && value !== null
        ? cache.includes(value)
          ? undefined // Duplicate reference found, discard key
          : cache.push(value) && value // Store value in our collection
        : value,
    indent
  );
  cache = null as any;
  return retVal;
}
