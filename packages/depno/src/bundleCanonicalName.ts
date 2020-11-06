import { NodePath } from '@babel/core';
import traverse from '@babel/traverse';
import {
  identifier,
  importDeclaration,
  importSpecifier,
  Program,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { join } from 'path';
import { Bundle } from './Bundle';
import { bundlePath } from './bundlePath';
import {
  canonicalIdentifier,
  CanonicalName,
  fullyQualifiedIdentifier,
} from './fullyQualifiedIdentifier';
import { getASTFromCode } from './getASTFromCode';
import { getContentsFromURI } from './getContentsFromURI';
import { nodeModules } from './nodeModules';

export async function bundleCanonicalName(
  canonicalName: CanonicalName
): Promise<Bundle> {
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
      referencesInDefinitions: new Map(),
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
      referencesInDefinitions: new Map(),
      macros: new Map(),
    };
  } else {
    let ast;
    if (canonicalName.uri === '@depno/core') {
      const uri = join(__dirname, '../assets/core.ts');
      ast = await getASTFromCode(await getContentsFromURI(uri), uri);
    } else {
      ast = await getASTFromCode(
        await getContentsFromURI(canonicalName.uri),
        canonicalName.uri
      );
    }

    let dependencyNodePath: NodePath;
    let dependencyProgramPath: NodePath<Program>;
    traverse(ast!, {
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

    return bundlePath(
      dependencyNodePath!,
      dependencyProgramPath!,
      canonicalName.uri
    );
  }
}
