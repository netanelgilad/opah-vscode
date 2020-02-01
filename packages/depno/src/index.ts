import { ChildProcess, spawn } from 'child_process';
import { parseAsync, transformFromAstAsync, NodePath } from '@babel/core';
import { file } from 'tempy';
import { writeFileSync, readFileSync } from 'fs';
import {
  File,
  isImportDeclaration,
  ImportDeclaration,
  stringLiteral,
} from '@babel/types';
import { resolve, dirname } from 'path';
import axios from 'axios';
import { resolve as urlResolve } from 'url';

export async function buildFile(path: string): Promise<string> {
  const fileContents = path.startsWith('/')
    ? readFileSync(path, 'utf8')
    : (await axios.get(path)).data;
  const ast = await parseAsync(fileContents, {
    filename: path,
    presets: ['@babel/preset-typescript'],
  });

  const importDeclarations: ImportDeclaration[] = (((ast as unknown) as File).program.body.filter(
    statement => isImportDeclaration(statement)
  ) as unknown) as ImportDeclaration[];

  const dependenciesToOutputFiles = new Map();

  for (const dependency of importDeclarations) {
    const dependencyPath = dependency.source.value;
    const dependencyURI = dependencyPath.startsWith('.')
      ? path.startsWith('/')
        ? resolve(dirname(path), dependencyPath)
        : urlResolve(path, dependencyPath)
      : dependencyPath;
    const dependencyOutputFile = await buildFile(dependencyURI);
    dependenciesToOutputFiles.set(dependencyPath, dependencyOutputFile);
  }

  const { code } = (await transformFromAstAsync(ast!, fileContents, {
    filename: path,
    presets: [
      '@babel/preset-typescript',
      [
        '@babel/preset-env',
        {
          targets: ['current node'],
        },
      ],
    ],
    plugins: [
      () => ({
        visitor: {
          ImportDeclaration(path: NodePath<ImportDeclaration>) {
            path.node.source = stringLiteral(
              dependenciesToOutputFiles.get(path.node.source.value)
            );
          },
        },
      }),
    ],
  }))!;

  const tmpFilePath = file();
  writeFileSync(tmpFilePath, code);
  return tmpFilePath;
}

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
    ? resolve(opts.cwd ?? process.cwd(), path)
    : path;

  const outputFile = await buildFile(uri);

  return spawn(
    'node',
    [
      '-e',
      `require("${outputFile}").${exportedFunctionName}(${args
        .map(x => JSON.stringify(x))
        .join(',')})`,
    ],
    {
      cwd: opts.cwd,
    }
  );
}
