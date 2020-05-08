import { NodePath, Binding } from '@babel/traverse';
import { isChildScope } from './isChildScope';
import {
  program,
  Statement,
  expressionStatement,
  isStatement,
  Expression,
  Program,
  isImportNamespaceSpecifier,
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
  objectPattern,
  objectProperty,
  callExpression,
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

const nodeBuildinModules = ['fs', 'stream', 'http'];

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
      if (isImportNamespaceSpecifier(binding.path.node)) {
        if (
          (binding.path.parent as ImportDeclaration).source.value === 'console'
        ) {
          return false;
        }
      }
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
        programPath,
        currentURI,
        undefined,
        bundledDefinitions
      );
    }
  }

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
            dependencyProgramPath!,
            dependencyURI,
            path.node.local.name,
            bundledDefinitions
          ))
        );
      } else if (nodeBuildinModules.includes(dependencyPath)) {
        statements.push(
          variableDeclaration('const', [
            variableDeclarator(
              objectPattern([
                objectProperty(path.node.local, path.node.local, false, true),
              ]),
              callExpression(identifier('require'), [
                stringLiteral(dependencyPath),
              ])
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
  programPath: NodePath<Program>,
  uri: string
) {
  const definitions = await bundleDefinitionsForPath(
    pathToBundle,
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

  return program(definitions.concat([pathValueStatement]));
}

export async function bundlePath(
  pathToBundle: NodePath,
  programPath: NodePath<Program>,
  currentURI: string
) {
  const programBeforeMacros = await bundleIntoASingleProgram(
    pathToBundle,
    programPath,
    currentURI
  );

  const { code } = (await transformFromAstAsync(
    programBeforeMacros!,
    undefined,
    {
      filename: currentURI,
      presets: [
        require('@babel/preset-typescript'),
        [
          require('@babel/preset-env'),
          {
            targets: ['current node'],
          },
        ],
      ],
      plugins: [
        () => ({
          visitor: {
            ReferencedIdentifier(path: NodePath<Identifier>, state: any) {
              if (path.node.name === 'bundleAST') {
                const callExpression = path.parentPath as NodePath<
                  CallExpression
                >;
                const toBundle = callExpression.get('arguments.0') as NodePath;
                const bundledProgram = bundleSameFile(
                  toBundle,
                  state.file.path
                );
                const code = generate(bundledProgram, {
                  compact: true,
                }).code;
                path.parentPath.replaceWith(
                  templateLiteral([templateElement({ raw: code })], [])
                );
              } else if (path.node.name === 'createMacro') {
                const macroVariableDeclaratorReferencePath =
                  path.parentPath.parentPath;
                const macroName = ((macroVariableDeclaratorReferencePath.node as VariableDeclarator)
                  .id as Identifier).name;
                const macroFunctionArgumentPath = path.parentPath.get(
                  'arguments.0'
                ) as NodePath<Expression>;

                const programForMacroArgument = bundleSameFile(
                  macroFunctionArgumentPath,
                  state.file.path
                );

                const code = generate(programForMacroArgument, {
                  compact: true,
                }).code;

                const macroFunction = eval(code);
                const macroDefinitionBinding = path.scope.getBinding(
                  macroName
                )!;
                for (const macroReference of macroDefinitionBinding.referencePaths) {
                  macroFunction({ reference: macroReference, types, state });
                  macroVariableDeclaratorReferencePath.remove();
                }
              }
            },
          },
        }),
      ],
    }
  ))!;

  return jsesc(code!, { quotes: 'backtick' });
}

function bundleSameFile(
  pathToBundle: NodePath,
  programPath: NodePath<Program>
) {
  const outOfScopeBindings = new Set<Binding>();
  if (isIdentifier(pathToBundle.node)) {
    const binding = programPath.scope.getBinding(pathToBundle.node.name);
    outOfScopeBindings.add(binding!);
  } else {
    // when the path to bundle is a declartion in itself, it should be included
    // in the bindings
    if (isVariableDeclarator(pathToBundle.node)) {
      const binding = pathToBundle.scope.getBinding(
        ((pathToBundle.node as VariableDeclarator).id as Identifier).name
      );
      outOfScopeBindings.add(binding!);
    } else if (isFunctionDeclaration(pathToBundle.node)) {
      const binding = pathToBundle.scope.getBinding(
        (pathToBundle.node as FunctionDeclaration).id?.name
      );
      outOfScopeBindings.add(binding!);
    }

    pathToBundle.traverse({
      // @ts-ignore
      ReferencedIdentifier(path: NodePath<Identifier>) {
        const binding = path.scope.getBinding(path.node.name);
        if (validateBinding(binding, path, programPath, pathToBundle)) {
          outOfScopeBindings.add(binding!);
        }
      },
    });
  }

  const statements: Statement[] = [];

  for (const path of Array.from(outOfScopeBindings).map(
    binding => binding.path
  )) {
    if (isVariableDeclarator(path.node)) {
      statements.push(variableDeclaration('const', [path.node]));
    } else if (isStatement(path.node)) {
      statements.push(path.node);
    } else {
      throw new Error('asdasdas');
    }
  }

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

  return program(statements.concat([pathValueStatement]));
}
