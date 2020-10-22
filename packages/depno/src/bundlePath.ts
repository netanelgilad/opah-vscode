import { transformFromAstAsync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { Identifier, Program } from '@babel/types';
import { bundleIntoASingleProgram } from './bundleIntoASingleProgram';
import { fullyQualifiedIdentifier } from './fullyQualifiedIdentifier';
import { generateNodeJsCompatibleCode } from './generateNodeJsCompatibleCode';
import { bundleToDefaultExport } from './macros/bundleToDefaultExport';
import { canonicalName } from './macros/canonicalName';
import { createMacro } from './macros/createMacro';

export async function bundlePath(
  pathToBundle: NodePath,
  isDefinition: boolean,
  programPath: NodePath<Program>,
  currentURI: string
) {
  const programBeforeMacros = await bundleIntoASingleProgram(
    pathToBundle,
    isDefinition,
    programPath,
    currentURI
  );

  const ast = await processMacros(programBeforeMacros, currentURI);

  return generateNodeJsCompatibleCode(ast, currentURI);
}

async function processMacros(programBeforeMacros: Program, currentURI: string) {
  const traversePromises: Promise<any>[] = [];

  const { ast } = (await transformFromAstAsync(
    programBeforeMacros!,
    undefined,
    {
      filename: currentURI,
      ast: true,
      code: false,
      plugins: [
        () => ({
          visitor: {
            ReferencedIdentifier(path: NodePath<Identifier>, state: any) {
              if (
                path.node.name ===
                fullyQualifiedIdentifier('bundler', 'bundleToDefaultExport')
              ) {
                traversePromises.push(
                  bundleToDefaultExport(currentURI, path, state)
                );
              } else if (
                path.node.name ===
                fullyQualifiedIdentifier('@depno/macros', 'createMacro')
              ) {
                traversePromises.push(createMacro(currentURI, path, state));
              } else if (
                path.node.name ===
                fullyQualifiedIdentifier('@depno/macros', 'canonicalName')
              ) {
                canonicalName(path);
              }
            },
          },
        }),
      ],
    }
  ))!;

  await Promise.all(traversePromises);

  return ast!;
}
