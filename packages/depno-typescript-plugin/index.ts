import { resolve } from "path";
import { readdirSync } from "fs";
import merge = require("merge-deep");

function init(modules: {
  typescript: typeof import("typescript/lib/tsserverlibrary");
}) {
  const ts = modules.typescript;

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
    types: [resolve(__dirname, "builtin-modules")],
    lib: ["lib.esnext.d.ts"],
  };

  function create(info: ts.server.PluginCreateInfo) {
    function log(message: any) {
      // info.project.projectService.logger.info(`depno: ${message}`);
    }

    const projectDirectory = info.project.getCurrentDirectory();
    // TypeScript plugins have a `cwd` of `/`, which causes issues with import resolution.
    process.chdir(projectDirectory);

    // ref https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#customizing-module-resolution
    const resolveModuleNames = info.languageServiceHost.resolveModuleNames;

    if (resolveModuleNames === undefined) {
      log("resolveModuleNames is undefined.");
      return info.languageService;
    }

    let buildInModules = readdirSync(
      resolve(__dirname, "./builtin-modules")
    ).map((moduleName: string) => moduleName.substr(0, moduleName.length - 5));

    info.languageServiceHost.resolveModuleNames = (
      moduleNames: string[],
      containingFile: string,
      _reusedNames?: string[],
      _redirectedReference?: ts.ResolvedProjectReference,
      options: ts.CompilerOptions = OPTIONS
    ) => {
      moduleNames = moduleNames.map((moduleName) => {
        if (buildInModules.includes(moduleName)) {
          return resolve(__dirname, `./builtin-modules/${moduleName}`);
        }
        return stripExtNameDotTs(moduleName);
      });

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
                  tc.newText = tc.newText.replace(
                    /^(import .* from ['"])(\..*)(['"];\n)/i,
                    "$1$2.ts$3"
                  );
                }
              }
            }
          }
        }
      }

      return details;
    };

    for (const functionName in info.languageService) {
      // @ts-ignore
      if (typeof info.languageService[functionName] === "function") {
        // @ts-ignore
        const origin = info.languageService[functionName];
        // @ts-ignore
        info.languageService[functionName] = (...args) => {
          log(`---> ${functionName} : ${safeStringify(args)}`);
          const result = origin.call(info.languageService, ...args);
          log(`<--- ${functionName}: ${safeStringify(result)}`);
          return result;
        };
      }
    }

    return info.languageService;
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
