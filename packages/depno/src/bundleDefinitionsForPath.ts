import { transformAsync } from '@babel/core';
import traverse, { Binding, NodePath } from '@babel/traverse';
import {
  classDeclaration,
  Expression,
  File,
  FunctionDeclaration,
  functionDeclaration,
  functionExpression,
  Identifier,
  identifier,
  ImportDeclaration,
  importDeclaration,
  ImportSpecifier,
  importSpecifier,
  isClassDeclaration,
  isExportDefaultDeclaration,
  isFunctionDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportSpecifier,
  isStatement,
  isVariableDeclarator,
  Program,
  Statement,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
  VariableDeclarator,
} from '@babel/types';
import { dirname, resolve } from 'path';
import { resolve as urlResolve } from 'url';
import { getDefinitionNameFromNode } from './getDefinitionNameFromNode';
import { fullyQualifiedIdentifier } from './fullyQualifiedIdentifier';
import { getContentsFromURI } from './getContentsFromURI';
import { globals } from './globals';
import { isChildScope } from './isChildScope';
import { withDefaults } from './withDefaults';

export async function bundleDefinitionsForPath(
  given: {
    pathToBundle: NodePath;
    isDefinition: boolean;
    programPath: NodePath<Program>;
    currentURI: string;
    wantedName?: string;
    bundledDefinitions?: string[];
    useCanonicalNames?: boolean;
  },
  opts = withDefaults(
    { bundledDefinitions: [] as string[], useCanonicalNames: true },
    given
  )
): Promise<Statement[]> {
  if (isIdentifier(opts.pathToBundle.node)) {
    const binding = opts.programPath.scope.getBinding(
      opts.pathToBundle.node.name
    );
    if (
      validateBinding(
        binding,
        opts.pathToBundle as NodePath<Identifier>,
        opts.programPath,
        opts.pathToBundle
      )
    ) {
      return bundleDefinitionsForPath({
        pathToBundle: binding!.path,
        isDefinition: true,
        programPath: opts.programPath,
        currentURI: opts.currentURI,
        bundledDefinitions: opts.bundledDefinitions,
        useCanonicalNames: opts.useCanonicalNames,
      });
    }
  }

  if (opts.isDefinition) {
    if (
      opts.bundledDefinitions.includes(
        fullyQualifiedIdentifier(
          opts.currentURI,
          getDefinitionNameFromNode(opts.pathToBundle.node)
        )
      )
    ) {
      return [];
    }

    opts.bundledDefinitions.push(
      fullyQualifiedIdentifier(
        opts.currentURI,
        getDefinitionNameFromNode(opts.pathToBundle.node)
      )
    );
  }

  const outOfScopeBindings = new Set<Binding>();
  const replacements: (() => unknown)[] = [];
  opts.pathToBundle.traverse({
    // @ts-ignore
    ReferencedIdentifier(path: NodePath<Identifier>) {
      const binding = path.scope.getBinding(path.node.name);
      if (validateBinding(binding, path, opts.programPath, opts.pathToBundle)) {
        if (binding!.path !== opts.pathToBundle) {
          outOfScopeBindings.add(binding!);
        }

        if (opts.useCanonicalNames) {
          if (isImportSpecifier(binding!.path.node)) {
            replacements.push(() => {
              path.replaceWith(
                identifier(
                  fullyQualifiedIdentifier(
                    resolveURIFromDependency(
                      (binding!.path.parentPath as NodePath<ImportDeclaration>)
                        .node.source.value,
                      opts.currentURI
                    ),
                    path.node.name
                  )
                )
              );
            });
          } else if (
            isVariableDeclarator(binding!.path.node) ||
            isFunctionDeclaration(binding!.path.node) ||
            isClassDeclaration(binding!.path.node)
          ) {
            replacements.push(() => {
              const node = identifier(
                fullyQualifiedIdentifier(opts.currentURI, path.node.name)
              );
              node.loc = path.node.loc;
              path.replaceWith(node);
            });
          }
        }
      }
    },
  });

  replacements.forEach(replacement => replacement());

  const statements: Statement[] = [];

  for (const path of Array.from(outOfScopeBindings).map(
    binding => binding.path
  )) {
    if (
      isVariableDeclarator(path.node) ||
      isFunctionDeclaration(path.node) ||
      isClassDeclaration(path.node)
    ) {
      statements.push(
        ...(await bundleDefinitionsForPath({
          pathToBundle: path,
          isDefinition: true,
          programPath: opts.programPath,
          currentURI: opts.currentURI,
          bundledDefinitions: opts.bundledDefinitions,
          useCanonicalNames: opts.useCanonicalNames,
        }))
      );
    } else if (
      isImportSpecifier(path.node) ||
      isImportDefaultSpecifier(path.node)
    ) {
      const dependencyPath = (path.parentPath as NodePath<ImportDeclaration>)
        .node.source.value;
      const dependencyURI = dependencyPath.startsWith('http://')
        ? dependencyPath
        : dependencyPath.startsWith('.')
        ? opts.currentURI.startsWith('/')
          ? resolve(dirname(opts.currentURI), dependencyPath)
          : urlResolve(opts.currentURI, dependencyPath)
        : undefined;
      if (dependencyURI) {
        const code = await getContentsFromURI(dependencyURI);
        const { ast } = (await transformAsync(code, {
          filename: dependencyURI,
          ast: true,
          presets: [
            require('@babel/preset-typescript'),
            [
              require('@babel/preset-env'),
              {
                targets: {
                  node: 'current',
                },
                modules: false,
              },
            ],
          ],
        }))!;

        let dependencyNodePath: NodePath;
        let dependencyProgramPath: NodePath<Program>;
        traverse((ast as unknown) as File, {
          Program(programPath: NodePath<Program>) {
            dependencyProgramPath = programPath;
            let dependencyBinding;
            if (isImportDefaultSpecifier(path.node)) {
              programPath.traverse({
                ExportDefaultDeclaration: p => {
                  dependencyBinding = { path: p };
                },
              });
            } else {
              dependencyBinding = programPath.scope.getBinding(
                (path.node as ImportSpecifier).imported.name
              );
            }
            if (!dependencyBinding) {
              throw path.buildCodeFrameError(
                `Failed to find binding for ${
                  (path.node as ImportSpecifier).imported.name
                } at ${dependencyPath}`,
                ReferenceError
              );
            }
            dependencyNodePath = dependencyBinding.path;
          },
        });

        statements.push(
          ...(await bundleDefinitionsForPath({
            pathToBundle: dependencyNodePath!,
            isDefinition: true,
            programPath: dependencyProgramPath!,
            currentURI: dependencyURI,
            wantedName: path.node.local.name,
            bundledDefinitions: opts.bundledDefinitions,
            useCanonicalNames: opts.useCanonicalNames,
          }))
        );
      } else if (nodeBuildinModules.includes(dependencyPath)) {
        if (
          !opts.bundledDefinitions.includes(
            `${dependencyPath}#${path.node.local.name}`
          )
        ) {
          statements.push(
            importDeclaration(
              [
                importSpecifier(
                  identifier(
                    fullyQualifiedIdentifier(
                      dependencyPath,
                      path.node.local.name
                    )
                  ),
                  path.node.local
                ),
              ],
              stringLiteral(dependencyPath)
            )
          );
          opts.bundledDefinitions.push(
            `${dependencyPath}#${path.node.local.name}`
          );
        }
      } else if (dependencyPath === 'console') {
        if (
          !opts.bundledDefinitions.includes(
            `${dependencyPath}#${path.node.local.name}`
          )
        ) {
          statements.push(
            variableDeclaration('const', [
              variableDeclarator(
                identifier(fullyQualifiedIdentifier(dependencyPath, 'console')),
                identifier('console')
              ),
            ])
          );
          opts.bundledDefinitions.push(
            `${dependencyPath}#${path.node.local.name}`
          );
        }
      }
    } else if (isStatement(path.node)) {
      statements.push(path.node);
    } else {
      throw new Error('asdasdas');
    }
  }

  // when the path to bundle is a declartion in itself, it should be included
  // in the bindings
  if (isVariableDeclarator(opts.pathToBundle.node)) {
    const binding = opts.pathToBundle.scope.getBinding(
      ((opts.pathToBundle.node as VariableDeclarator | FunctionDeclaration)
        .id as Identifier).name
    );
    if (
      validateBinding(
        binding,
        opts.pathToBundle as NodePath<Identifier>,
        opts.programPath,
        opts.pathToBundle
      )
    ) {
      statements.push(
        variableDeclaration('const', [
          variableDeclarator(
            identifier(
              opts.useCanonicalNames
                ? fullyQualifiedIdentifier(
                    opts.currentURI,
                    (opts.pathToBundle.node.id as Identifier).name
                  )
                : (opts.pathToBundle.node.id as Identifier).name
            ),
            opts.pathToBundle.node.init
          ),
        ])
      );
    }
  } else if (isFunctionDeclaration(opts.pathToBundle.node)) {
    statements.push(
      functionDeclaration(
        identifier(
          opts.useCanonicalNames
            ? fullyQualifiedIdentifier(
                opts.currentURI,
                opts.pathToBundle.node.id?.name
              )
            : opts.pathToBundle.node.id?.name
        ),
        opts.pathToBundle.node.params,
        opts.pathToBundle.node.body,
        opts.pathToBundle.node.generator,
        opts.pathToBundle.node.async
      )
    );
  } else if (isExportDefaultDeclaration(opts.pathToBundle.node)) {
    if (opts.wantedName) {
      statements.push(
        variableDeclaration('const', [
          variableDeclarator(
            identifier(opts.wantedName),
            isFunctionDeclaration(opts.pathToBundle.node.declaration)
              ? functionExpression(
                  opts.pathToBundle.node.declaration.id,
                  opts.pathToBundle.node.declaration.params,
                  opts.pathToBundle.node.declaration.body,
                  opts.pathToBundle.node.declaration.generator,
                  opts.pathToBundle.node.declaration.async
                )
              : (opts.pathToBundle.node.declaration as Expression)
          ),
        ])
      );
    }
  } else if (isClassDeclaration(opts.pathToBundle.node)) {
    statements.push(
      classDeclaration(
        identifier(
          opts.useCanonicalNames
            ? fullyQualifiedIdentifier(
                opts.currentURI,
                opts.pathToBundle.node.id?.name
              )
            : opts.pathToBundle.node.id?.name
        ),
        opts.pathToBundle.node.superClass,
        opts.pathToBundle.node.body,
        opts.pathToBundle.node.decorators
      )
    );
  }

  return statements;
}

const nodeBuildinModules = [
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

function validateBinding(
  binding: Binding | undefined,
  path: NodePath<Identifier>,
  programPath: NodePath<Program>,
  pathToBundle: NodePath
) {
  if (!binding) {
    if (!globals.includes(path.node.name)) {
      // TODO: find a way to use buildCodeFrameError
      throw new ReferenceError(`Could not find ${path.node.name}`);
    } else {
      return false;
    }
  } else {
    if (binding.scope === programPath.scope) {
      return true;
    } else {
      if (!isChildScope(binding.scope, pathToBundle.scope)) {
        throw path.buildCodeFrameError(
          `Cannot reference a non program declaration: ${path.node.name}`,
          ReferenceError
        );
      }
      return false;
    }
  }
}

function resolveURIFromDependency(dependencyPath: string, currentURI: string) {
  return dependencyPath.startsWith('http://')
    ? dependencyPath
    : dependencyPath.startsWith('.')
    ? currentURI.startsWith('/')
      ? resolve(dirname(currentURI), dependencyPath)
      : urlResolve(currentURI, dependencyPath)
    : dependencyPath;
  // return dependencyPath.startsWith('.')
  //   ? resolve(dirname(currentURI), dependencyPath)
  //   : dependencyPath;
}
