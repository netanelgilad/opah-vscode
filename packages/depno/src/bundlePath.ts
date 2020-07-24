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

const nodeBuildinModules = ['fs', 'stream', 'http', 'https'];

function validateBinding(
  binding: Binding | undefined,
  path: NodePath<Identifier>,
  programPath: NodePath<Program>,
  pathToBundle: NodePath
) {
  if (!binding) {
    if (!globals.includes(path.node.name)) {
      // TODO: find a way to use buildCodeFrameError
      throw new ReferenceError(`Could not find ${JSON.stringify(path.node)}`);
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

async function bundleDefinitionsForPath(
  pathToBundle: NodePath,
  isDefinition: boolean,
  programPath: NodePath<Program>,
  currentURI: string,
  wantedName?: string,
  bundledDefinitions: string[] = []
): Promise<Statement[]> {
  if (isIdentifier(pathToBundle.node)) {
    const binding = programPath.scope.getBinding(pathToBundle.node.name);
    if (
      validateBinding(
        binding,
        pathToBundle as NodePath<Identifier>,
        programPath,
        pathToBundle
      )
    ) {
      return bundleDefinitionsForPath(
        binding!.path,
        true,
        programPath,
        currentURI,
        undefined,
        bundledDefinitions
      );
    }
  }

  if (isDefinition) {
    if (
      bundledDefinitions.includes(
        `${currentURI}#${getDefinitionNameFromNode(pathToBundle.node)}`
      )
    ) {
      return [];
    }

    bundledDefinitions.push(
      `${currentURI}#${getDefinitionNameFromNode(pathToBundle.node)}`
    );
  }

  const outOfScopeBindings = new Set<Binding>();
  pathToBundle.traverse({
    // @ts-ignore
    ReferencedIdentifier(path: NodePath<Identifier>) {
      const binding = path.scope.getBinding(path.node.name);
      if (
        validateBinding(binding, path, programPath, pathToBundle) &&
        binding!.path !== pathToBundle
      ) {
        outOfScopeBindings.add(binding!);
      }
    },
  });

  const statements: Statement[] = [];

  for (const path of Array.from(outOfScopeBindings).map(
    binding => binding.path
  )) {
    if (isVariableDeclarator(path.node) || isFunctionDeclaration(path.node)) {
      statements.push(
        ...(await bundleDefinitionsForPath(
          path,
          true,
          programPath,
          currentURI,
          undefined,
          bundledDefinitions
        ))
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
        ? currentURI.startsWith('/')
          ? resolve(dirname(currentURI), dependencyPath)
          : urlResolve(currentURI, dependencyPath)
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
          ...(await bundleDefinitionsForPath(
            dependencyNodePath!,
            true,
            dependencyProgramPath!,
            dependencyURI,
            path.node.local.name,
            bundledDefinitions
          ))
        );
      } else if (nodeBuildinModules.includes(dependencyPath)) {
        if (
          !bundledDefinitions.includes(
            `${dependencyPath}#${path.node.local.name}`
          )
        ) {
          statements.push(
            types.importDeclaration(
              [types.importSpecifier(path.node.local, path.node.local)],
              stringLiteral(dependencyPath)
            )
          );
          bundledDefinitions.push(`${dependencyPath}#${path.node.local.name}`);
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
  if (isVariableDeclarator(pathToBundle.node)) {
    const binding = pathToBundle.scope.getBinding(
      ((pathToBundle.node as VariableDeclarator | FunctionDeclaration)
        .id as Identifier).name
    );
    if (
      validateBinding(
        binding,
        pathToBundle as NodePath<Identifier>,
        programPath,
        pathToBundle
      )
    ) {
      statements.push(variableDeclaration('const', [pathToBundle.node]));
    }
  } else if (isFunctionDeclaration(pathToBundle.node)) {
    statements.push(pathToBundle.node);
  } else if (isExportDefaultDeclaration(pathToBundle.node)) {
    if (wantedName) {
      statements.push(
        variableDeclaration('const', [
          variableDeclarator(
            identifier(wantedName),
            isFunctionDeclaration(pathToBundle.node.declaration)
              ? functionExpression(
                  pathToBundle.node.declaration.id,
                  pathToBundle.node.declaration.params,
                  pathToBundle.node.declaration.body,
                  pathToBundle.node.declaration.generator,
                  pathToBundle.node.declaration.async
                )
              : (pathToBundle.node.declaration as Expression)
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
  uri: string
) {
  const definitions = await bundleDefinitionsForPath(
    pathToBundle,
    isDefinition,
    programPath,
    uri
  );

  const pathValueStatement = isStatement(pathToBundle.node)
    ? isExportDefaultDeclaration(pathToBundle.node)
      ? isFunctionDeclaration(pathToBundle.node) ||
        isClassDeclaration(pathToBundle.node)
        ? pathToBundle.node
        : expressionStatement(pathToBundle.node.declaration as Expression)
      : pathToBundle.node
    : isVariableDeclarator(pathToBundle.node)
    ? expressionStatement(
        (pathToBundle.node as VariableDeclarator).id as Identifier
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
              if (path.node.name === 'bundleToDefaultExport') {
                traversePromises.push(
                  (async () => {
                    const callExpression = path.parentPath as NodePath<
                      CallExpression
                    >;
                    const toBundle = callExpression.get(
                      'arguments.0'
                    ) as NodePath<CallExpression['arguments'][number]>;
                    const definitions = await bundleDefinitionsForPath(
                      toBundle,
                      false,
                      state.file.path,
                      currentURI
                    );

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
              } else if (path.node.name === 'createMacro') {
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
                      currentURI
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
