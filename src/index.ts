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

export async function buildFile(path: string): Promise<string> {
  const fileContents = readFileSync(path, 'utf8');
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
    const dependencyOutputFile = await buildFile(
      resolve(dirname(path), dependencyPath)
    );
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

export async function runFile(path: string): Promise<ChildProcess> {
  const outputFile = await buildFile(path);

  return spawn('node', [outputFile]);
}
