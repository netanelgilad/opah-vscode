import { NodePath } from '@babel/core';
import {
  importDeclaration,
  importSpecifier,
  identifier,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
  Program,
  File,
} from '@babel/types';
import {
  CaononicalDefinitionNode,
  bundleDefinitionsForPath2,
  MacroFunction,
} from './bundleDefinitionsForPath2';
import {
  canonicalIdentifier,
  CanonicalName,
  fullyQualifiedIdentifier,
} from './fullyQualifiedIdentifier';
import { getASTFromCode } from './getASTFromCode';
import { getContentsFromURI } from './getContentsFromURI';
import traverse from '@babel/traverse';

const nodeModules = [
  'fs',
  'stream',
  'http',
  'https',
  'buffer',
  'crypto',
  'zlib',
  'url',
  'readline',
  'path',
];

export async function bundleCanonicalName(
  canonicalName: CanonicalName
): Promise<{
  definitions: Map<string, CaononicalDefinitionNode>;
  macros: Map<string, MacroFunction>;
}> {
  if (nodeModules.includes(canonicalName.uri)) {
    return {
      definitions: new Map([
        [
          canonicalIdentifier(canonicalName),
          importDeclaration(
            [
              importSpecifier(
                identifier(
                  fullyQualifiedIdentifier(
                    canonicalName.uri,
                    canonicalName.name
                  )
                ),
                identifier(canonicalName.name)
              ),
            ],
            stringLiteral(canonicalName.uri)
          ),
        ],
      ]),
      macros: new Map(),
    };
  } else if (canonicalName.uri === 'console') {
    return {
      definitions: new Map([
        [
          canonicalIdentifier(canonicalName),
          variableDeclaration('const', [
            variableDeclarator(
              identifier(fullyQualifiedIdentifier('console', 'console')),
              identifier('console')
            ),
          ]),
        ],
      ]),
      macros: new Map(),
    };
  } else {
    const code = await getContentsFromURI(canonicalName.uri);
    const ast = await getASTFromCode(code, canonicalName.uri);

    let dependencyNodePath: NodePath;
    let dependencyProgramPath: NodePath<Program>;
    traverse((ast as unknown) as File, {
      Program(programPath: NodePath<Program>) {
        dependencyProgramPath = programPath;
        let dependencyBinding;
        if (canonicalName.name === 'default') {
          programPath.traverse({
            ExportDefaultDeclaration: p => {
              dependencyBinding = { path: p };
            },
          });
        } else {
          dependencyBinding = programPath.scope.getBinding(canonicalName.name);
        }
        if (!dependencyBinding) {
          throw programPath.buildCodeFrameError(
            `Failed to find binding for ${canonicalName.name} at ${canonicalName.uri}`,
            ReferenceError
          );
        }
        dependencyNodePath = dependencyBinding.path;
      },
    });

    return bundleDefinitionsForPath2(
      dependencyNodePath!,
      dependencyProgramPath!,
      canonicalName.uri
    );
  }
}
