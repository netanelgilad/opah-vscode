import { ChildProcess, fork } from 'child_process';
import { NodePath, transformAsync } from '@babel/core';
import { file } from 'tempy';
import { writeFileSync } from 'fs';
import { File } from '@babel/types';
import * as types from '@babel/types';
import { resolve } from 'path';
import { bundlePath } from './bundlePath';
import { getContentsFromURI } from './getContentsFromURI';
import traverse from '@babel/traverse';

export async function runFile(
  path: string,
  opts: {
    exportedFunctionName?: string;
    args?: any[];
    cwd?: string;
  } = {}
): Promise<ChildProcess> {
  const args = opts.args ?? [];
  const exportedFunctionName = opts.exportedFunctionName ?? 'default';
  const uri = path.startsWith('.')
    ? resolve(opts.cwd || process.cwd(), path)
    : path;

  const code = await getContentsFromURI(uri);

  let dependencyNodePath: NodePath;
  let dependencyProgramPath: NodePath<types.Program>;
  const { ast } = (await transformAsync(code, {
    filename: uri,
    ast: true,
    presets: [
      require('@babel/preset-typescript'),
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current',
          },
          modules: false,
        },
      ],
    ],
  }))!;

  if (exportedFunctionName === 'default') {
    traverse((ast as unknown) as File, {
      Program(programPath) {
        dependencyProgramPath = programPath;
      },
      ExportDefaultDeclaration(exportDefaultPath) {
        dependencyNodePath = exportDefaultPath;
        exportDefaultPath.stop();
      },
    });
  } else {
    traverse((ast as unknown) as File, {
      Program(programPath) {
        dependencyProgramPath = programPath;
        const dependencyBinding = programPath.scope.getBinding(
          exportedFunctionName
        );
        if (!dependencyBinding) {
          throw new ReferenceError(
            `Failed to find binding for ${exportedFunctionName} at ${uri}`
          );
        }
        dependencyNodePath = dependencyBinding.path;
      },
    });
  }

  const functionToRunCode = await bundlePath(
    dependencyNodePath!,
    dependencyProgramPath!,
    uri
  );

  const tmpFile = file({ extension: 'js' });

  writeFileSync(
    tmpFile,
    `eval(\`${functionToRunCode}\`)(${args
      .map(x => JSON.stringify(x))
      .join(',')})`
  );

  return fork(tmpFile, [], {
    cwd: opts.cwd,
    stdio: 'pipe',
  });
}
