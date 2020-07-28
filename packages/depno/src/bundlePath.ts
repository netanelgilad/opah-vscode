import { NodePath, Binding } from '@babel/traverse';
import { isChildScope } from './isChildScope';
import {
  program,
  Statement,
  expressionStatement,
  isStatement,
  Expression,
  Program,
  ImportDeclaration,
  isVariableDeclarator,
  variableDeclaration,
  isIdentifier,
  Identifier,
  isImportSpecifier,
  ImportSpecifier,
  File,
  isExportDefaultDeclaration,
  isFunctionDeclaration,
  isClassDeclaration,
  VariableDeclarator,
  FunctionDeclaration,
  variableDeclarator,
  identifier,
  stringLiteral,
  CallExpression,
  templateLiteral,
  templateElement,
  isImportDefaultSpecifier,
  functionExpression,
  Node,
} from '@babel/types';
import * as types from '@babel/types';
import { getContentsFromURI } from './getContentsFromURI';
import { transformFromAstAsync, transformAsync } from '@babel/core';
import { resolve, dirname } from 'path';
import { resolve as urlResolve } from 'url';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import jsesc from 'jsesc';
import { globals } from './globals';
import { fullyQualifiedIdentifier } from './fullyQualifiedIdentifier';

const nodeBuildinModules = ['fs', 'stream', 'http', 'https', 'buffer'];

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

export function getDefinitionNameFromNode(node: Node) {
  if (isVariableDeclarator(node)) {
    return (node.id as Identifier).name;
  } else if (types.isExportDefaultDeclaration(node)) {
    return 'default';
  } else if (isFunctionDeclaration(node)) {
    return node.id!.name;
  } else if (types.isVariableDeclaration(node)) {
    return (node.declarations[0].id as Identifier).name;
  } else if (isIdentifier(node)) {
    return node.name;
  }
  throw new Error(
    `Don't know how to getDefinitionNameFromNode for node of type ${node.type}`
  );
}

function withDefaults<TRequired, TDefaults>(
  defaults: TDefaults,
  opts: TRequired
): TRequired & TDefaults {
  return {
    ...defaults,
    ...(Object.fromEntries(
      Object.entries(opts).filter(([, val]) => typeof val !== 'undefined')
    ) as TRequired),
  };
}

async function bundleDefinitionsForPath(
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
            isFunctionDeclaration(binding!.path.node)
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
    if (isVariableDeclarator(path.node) || isFunctionDeclaration(path.node)) {
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
            types.importDeclaration(
              [
                types.importSpecifier(
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
        statements.push(
          types.variableDeclaration('const', [
            variableDeclarator(
              identifier(fullyQualifiedIdentifier(dependencyPath, 'console')),
              identifier('console')
            ),
          ])
        );
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
      types.functionDeclaration(
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
  }

  return statements;
}

async function bundleIntoASingleProgram(
  pathToBundle: NodePath,
  isDefinition: boolean,
  programPath: NodePath<Program>,
  uri: string,
  useCanonicalNames?: boolean
) {
  const definitions = await bundleDefinitionsForPath({
    pathToBundle,
    isDefinition,
    programPath,
    currentURI: uri,
    useCanonicalNames,
  });

  const pathValueStatement = isStatement(pathToBundle.node)
    ? isExportDefaultDeclaration(pathToBundle.node)
      ? isFunctionDeclaration(pathToBundle.node) ||
        isClassDeclaration(pathToBundle.node)
        ? pathToBundle.node
        : expressionStatement(pathToBundle.node.declaration as Expression)
      : pathToBundle.node
    : isVariableDeclarator(pathToBundle.node)
    ? expressionStatement(
        identifier(
          fullyQualifiedIdentifier(
            uri,
            (pathToBundle.node.id as Identifier).name
          )
        )
      )
    : expressionStatement(pathToBundle.node as Expression);

  return program(definitions.concat([pathValueStatement]), undefined, 'module');
}

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
                  (async () => {
                    const callExpression = path.parentPath as NodePath<
                      CallExpression
                    >;
                    const toBundle = callExpression.get(
                      'arguments.0'
                    ) as NodePath<CallExpression['arguments'][number]>;
                    const definitions = await bundleDefinitionsForPath({
                      pathToBundle: toBundle,
                      isDefinition: false,
                      programPath: state.file.path,
                      currentURI,
                      useCanonicalNames: false,
                    });

                    const bundledProgram = program(
                      definitions.concat([
                        types.exportDefaultDeclaration(toBundle.node as any),
                      ])
                    );

                    const code = generate(bundledProgram, {
                      compact: true,
                    }).code;
                    path.parentPath.replaceWith(
                      templateLiteral([templateElement({ raw: code })], [])
                    );
                  })()
                );
              } else if (
                path.node.name ===
                fullyQualifiedIdentifier('@depno/macros', 'createMacro')
              ) {
                traversePromises.push(
                  (async () => {
                    const macroVariableDeclaratorReferencePath =
                      path.parentPath.parentPath;
                    const macroName = ((macroVariableDeclaratorReferencePath.node as VariableDeclarator)
                      .id as Identifier).name;
                    const macroFunctionArgumentPath = path.parentPath.get(
                      'arguments.0'
                    ) as NodePath<Expression>;

                    const programForMacroArgument = await bundleIntoASingleProgram(
                      macroFunctionArgumentPath,
                      false,
                      state.file.path,
                      currentURI,
                      false
                    );

                    const code = generate(programForMacroArgument, {
                      compact: true,
                    }).code;

                    const macroFunction = eval(code);
                    const macroDefinitionBinding = path.scope.getBinding(
                      macroName
                    )!;
                    for (const macroReference of macroDefinitionBinding.referencePaths) {
                      macroFunction({
                        reference: macroReference,
                        types,
                        state,
                      });
                      macroVariableDeclaratorReferencePath.remove();
                    }
                  })()
                );
              }
            },
          },
        }),
      ],
    }
  ))!;

  await Promise.all(traversePromises);

  const { code } = (await transformFromAstAsync(ast!, undefined, {
    code: true,
    filename: currentURI,
    plugins: [require('@babel/plugin-transform-modules-commonjs')],
  }))!;

  return jsesc(code!, { quotes: 'backtick' });
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
