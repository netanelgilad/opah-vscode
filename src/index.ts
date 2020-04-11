import { ChildProcess, spawn } from 'child_process';
import {
  parseAsync,
  transformFromAstAsync,
  transformFromAstSync,
  NodePath,
} from '@babel/core';
import { file } from 'tempy';
import { writeFileSync, readFileSync } from 'fs';
import {
  File,
  isImportDeclaration,
  ImportDeclaration,
  stringLiteral,
  VariableDeclarator,
  Identifier,
} from '@babel/types';
import * as types from '@babel/types';
import { resolve, dirname } from 'path';
import axios from 'axios';
import { resolve as urlResolve } from 'url';
import { bundlePath } from './bundlePath';

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
      : dependencyPath.startsWith('http')
      ? dependencyPath
      : undefined;
    if (dependencyURI) {
      const dependencyOutputFile = await buildFile(dependencyURI);
      dependenciesToOutputFiles.set(dependencyPath, dependencyOutputFile);
    }
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
          ImportDeclaration(path: NodePath<ImportDeclaration>, state: any) {
            const dependencyPath = path.node.source.value;
            if (dependenciesToOutputFiles.has(dependencyPath)) {
              path.node.source = stringLiteral(
                dependenciesToOutputFiles.get(dependencyPath)
              );
            } else {
              const localName = path.node.specifiers[0].local.name;
              const binding = path.scope.getBinding(localName)!;
              for (const referenceToCreateMacro of binding.referencePaths) {
                const macroVariableDeclaratorReferencePath =
                  referenceToCreateMacro.parentPath.parentPath;
                const macroName = ((macroVariableDeclaratorReferencePath.node as VariableDeclarator)
                  .id as Identifier).name;
                const macroFunctionArgumentPath = referenceToCreateMacro.parentPath.get(
                  'arguments.0'
                ) as NodePath<types.Expression>;

                const programForMacroArgument = bundlePath(
                  macroFunctionArgumentPath,
                  state.file.path.get('program')
                );

                const macroFunction = eval(
                  transformFromAstSync(programForMacroArgument, '', {
                    filename: 'temp.ts',
                    presets: [
                      '@babel/preset-typescript',
                      [
                        '@babel/preset-env',
                        {
                          targets: ['current node'],
                        },
                      ],
                    ],
                  })!.code!
                );
                const macroDefinitionBinding = referenceToCreateMacro.scope.getBinding(
                  macroName
                )!;
                for (const macroReference of macroDefinitionBinding.referencePaths) {
                  macroFunction({ reference: macroReference, types, state });
                  macroVariableDeclaratorReferencePath.remove();
                }
              }
              path.remove();
            }
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
  const uri = path;

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
