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
} from '@babel/types';
import * as types from '@babel/types';
import { getContentsFromURI } from './getContentsFromURI';
import { parseAsync, transformFromAstAsync } from '@babel/core';
import { resolve, dirname } from 'path';
import { resolve as urlResolve } from 'url';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import jsesc from 'jsesc';

const nodeBuildinModules = ['fs', 'stream', 'http'];

function validateBinding(
  binding: Binding | undefined,
  path: NodePath<Identifier>,
  programPath: NodePath<Program>,
  pathToBundle: NodePath
) {
  if (!binding) {
    // TODO: find a way to use buildCodeFrameError
    throw new ReferenceError(`Could not find ${path.node.name}`);
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

async function bundlePathDependencies(
  pathToBundle: NodePath,
  programPath: NodePath<Program>,
  currentURI: string
): Promise<Statement[]> {
  const outOfScopeBindings = new Set<Binding>();
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
      return bundlePathDependencies(binding!.path, programPath, currentURI);
    }
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

  const statements: Statement[] = [];

  for (const path of Array.from(outOfScopeBindings).map(
    binding => binding.path
  )) {
    if (isVariableDeclarator(path.node)) {
      statements.push(
        ...(await bundlePathDependencies(path, programPath, currentURI))
      );
    } else if (isImportSpecifier(path.node)) {
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
        const ast = await parseAsync(code, {
          filename: dependencyURI,
          presets: [require('@babel/preset-typescript')],
        })!;

        let dependencyNodePath: NodePath;
        let dependencyProgramPath: NodePath<Program>;
        traverse((ast as unknown) as File, {
          Program(programPath: NodePath<Program>) {
            dependencyProgramPath = programPath;
            const dependencyBinding = programPath.scope.getBinding(
              (path.node as ImportSpecifier).imported.name
            );
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
          ...(await bundlePathDependencies(
            dependencyNodePath!,
            dependencyProgramPath!,
            dependencyURI
          ))
        );
      } else if (nodeBuildinModules.includes(dependencyPath)) {
        statements.push(
          variableDeclaration('const', [
            variableDeclarator(
              objectPattern([
                objectProperty(
                  path.node.imported,
                  path.node.imported,
                  false,
                  true
                ),
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
  }

  return statements;
}

export async function bundlePath(
  pathToBundle: NodePath,
  programPath: NodePath<Program>,
  currentURI: string
) {
  const definitions = await bundlePathDependencies(
    pathToBundle,
    programPath,
    currentURI
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

  const programBeforeMacros = program(definitions.concat([pathValueStatement]));

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
