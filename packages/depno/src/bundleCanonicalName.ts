import { NodePath } from '@babel/core';
import traverse from '@babel/traverse';
import {
  CallExpression,
  callExpression,
  classExpression,
  Expression,
  ExpressionStatement,
  expressionStatement,
  file,
  File,
  functionExpression,
  identifier,
  Identifier,
  isCallExpression,
  isClassDeclaration,
  isExportDefaultDeclaration,
  isExpression,
  isFunctionDeclaration,
  isIdentifier,
  isVariableDeclarator,
  memberExpression,
  Node,
  program,
  Program,
  stringLiteral,
} from '@babel/types';
import { Map, Set } from 'immutable';
import { join } from 'path';
import { fields, isType, variant } from 'variant';
import {
  Bundle,
  Definition,
  ExecutionBundle,
  LocalName,
  MacroFunction,
  ReferencedDefinitionNode,
} from './Bundle';
import { DefinitionNotFoundInBundleError } from './DefinitionNotFoundInBundleError';
import { DefinitionNotFoundInCanonicalDefinitionError } from './DefinitionNotFoundInCanonicalDefinitionError';
import { CanonicalName } from './fullyQualifiedIdentifier';
import { ASTStore, getASTFromCode } from './getASTFromCode';
import { getCanonicalNameFromPath } from './getCanonicalNameFromPath';
import { getContentsFromURI, URIStore } from './getContentsFromURI';
import { globals } from './globals';
import { isReferencedDefinitionNode } from './isReferencedDefinitionNode';
import { nodeModules } from './nodeModules';
import { executeBundle } from './runtime';

export async function bundleCanonicalName(
  uriStore: URIStore,
  astStore: ASTStore,
  bundle: Bundle,
  canonicalName: CanonicalName
): Promise<readonly [URIStore, ASTStore, Bundle]> {
  if (bundle.has(canonicalName)) {
    return [uriStore, astStore, bundle];
  }

  if (nodeModules.includes(canonicalName.uri)) {
    return [
      uriStore,
      astStore,
      bundle.set(
        canonicalName,
        Definition({
          expression: memberExpression(
            callExpression(identifier('require'), [
              stringLiteral(canonicalName.uri),
            ]),
            identifier(canonicalName.name)
          ),
          references: Map(),
        })
      ),
    ];
  } else if (canonicalName.uri === 'console') {
    return [
      uriStore,
      astStore,
      bundle.set(
        canonicalName,
        Definition({ expression: identifier('console'), references: Map() })
      ),
    ];
  } else if (canonicalName.uri === '@depno/runtime') {
    return [
      uriStore,
      astStore,
      bundle.set(
        canonicalName,
        Definition({
          expression: memberExpression(
            callExpression(identifier('require'), [
              stringLiteral(require.resolve('./runtime')),
            ]),
            identifier(canonicalName.name)
          ),
          references: Map(),
        })
      ),
    ];
  } else {
    const uriToRead =
      canonicalName.uri === '@depno/core'
        ? join(__dirname, '../assets/core.ts')
        : canonicalName.uri;
    let [updatedUriStore, contents] = await getContentsFromURI(
      uriStore,
      uriToRead
    );
    let [updatedAstStore, ast] = await getASTFromCode(
      astStore,
      contents,
      uriToRead
    );

    const { definitionPath, programPath } = getDefinitionAndProgramPaths(
      ast,
      canonicalName.name
    );

    if (!definitionPath) {
      throw programPath.buildCodeFrameError(
        `Failed to find binding for ${canonicalName.name} at ${canonicalName.uri}`,
        ReferenceError
      );
    }

    const definitionNode = definitionPath.node;

    if (!isReferencedDefinitionNode(definitionNode)) {
      throw definitionPath.buildCodeFrameError(
        `Cannot bundle a non reference definition of node. The node type requested was ${definitionNode.type}`
      );
    }

    const definitionExpression = getExpressionFromReferencedDefinitionNode(
      definitionNode
    );

    let references: Map<string, CanonicalName>;
    try {
      references = getReferencesFromExpression(
        definitionExpression,
        canonicalName.uri,
        programPath
      );
    } catch (err) {
      if (isType(DefinitionNotFoundError, err)) {
        throw DefinitionNotFoundInCanonicalDefinitionError({
          canonicalName,
          reference: err.reference,
        });
      } else {
        throw err;
      }
    }

    let definition = Definition({
      expression: definitionExpression,
      references,
    });

    let updatedBundle = bundle.set(canonicalName, definition);

    let macros = Map<LocalName, MacroFunction>();

    for (const reference of references.filter(
      referenceCanonicalName =>
        !referenceCanonicalName.equals(canonicalName) &&
        !referenceCanonicalName.equals(
          CanonicalName({
            uri: '@depno/core',
            name: 'createMacro',
          })
        )
    )) {
      const [
        referenceUriStore,
        referenceASTStore,
        referenceBundle,
      ] = await bundleCanonicalName(
        updatedUriStore,
        updatedAstStore,
        updatedBundle,
        reference[1]
      );

      const referenceDefinition = referenceBundle.get(reference[1])!;

      if (isMacroDefinition(referenceDefinition)) {
        assertExpression(referenceDefinition.expression.arguments[0]);

        const executionBundle = ExecutionBundle({
          definitions: referenceBundle.remove(reference[1]),
          execute: Definition({
            expression: referenceDefinition.expression.arguments[0],
            references: referenceDefinition.references.delete('createMacro'),
          }),
        });

        const macroFunction: MacroFunction = executeBundle(executionBundle);
        macros = macros.set(reference[0], macroFunction);
        definition = definition.set(
          'references',
          references.delete(reference[0])
        );
      } else {
        updatedBundle = referenceBundle;
      }
      updatedUriStore = referenceUriStore;
      updatedAstStore = referenceASTStore;
    }

    let tempProgram = program([expressionStatement(definitionExpression)]);

    traverse(file(tempProgram, undefined, undefined), {
      // @ts-ignore
      ReferencedIdentifier(referencePath: NodePath<Identifier>) {
        if (macros.has(referencePath.node.name)) {
          assertCallExpression(referencePath.parentPath.node);

          const argsBundles = referencePath.parentPath.node.arguments.map(
            argExpression => {
              assertExpression(argExpression);
              // Continue from here: need to get the out of scope references, bundle them and call the macro
              // function, then replace the reference path parent
              const argReferences = getOutOfScopeReferences(argExpression);

              const referencesCanonicalNames = argReferences.map(
                reference => references.get(reference)!
              );

              return ExecutionBundle({
                definitions: bundleCanonicalNamesFromBundle(
                  updatedBundle,
                  referencesCanonicalNames
                ),
                execute: Definition({
                  expression: argExpression,
                  references: argReferences.reduce(
                    (result, argReference) =>
                      result.set(argReference, references.get(argReference)!),
                    Map()
                  ),
                }),
              });
            }
          );

          const replacement = macros.get(referencePath.node.name)!(
            ...argsBundles
          );
          referencePath.parentPath.replaceWith(replacement.execute.expression);
          definition = definition.set(
            'references',
            definition.references.merge(replacement.execute.references)
          );
          updatedBundle = updatedBundle.merge(replacement.definitions);
        }
      },
    });

    definition = definition.set(
      'expression',
      (tempProgram.body[0] as ExpressionStatement).expression
    );
    updatedBundle = updatedBundle.set(canonicalName, definition);

    return [uriStore, astStore, updatedBundle] as const;
  }
}

function getDefinitionAndProgramPaths(ast: File, name: string) {
  let definitionPath: NodePath | undefined;
  let programPath: NodePath<Program>;

  traverse(ast!, {
    Program(program: NodePath<Program>) {
      programPath = program;
      let dependencyBinding;
      if (name === 'default') {
        programPath.traverse({
          ExportDefaultDeclaration: p => {
            dependencyBinding = { path: p };
          },
        });
      } else {
        dependencyBinding = programPath.scope.getBinding(name);
      }
      if (dependencyBinding) {
        definitionPath = dependencyBinding.path;
      }
    },
  });

  return {
    definitionPath,
    programPath: programPath!,
  };
}

class NodeWithoutInitError extends Error {}
class ExportDefaultNonReferencedDefinitionNode extends Error {
  constructor(recievedNodeType: string) {
    super(
      `Found an export default of a non referenced definition node of type ${recievedNodeType}`
    );
  }
}

function getExpressionFromReferencedDefinitionNode(
  node: ReferencedDefinitionNode
): Expression {
  if (isVariableDeclarator(node)) {
    if (!node.init) {
      throw new NodeWithoutInitError();
    }
    return node.init;
  } else if (isFunctionDeclaration(node)) {
    return functionExpression(
      node.id,
      node.params,
      node.body,
      node.generator,
      node.async
    );
  } else if (isClassDeclaration(node)) {
    return classExpression(null, node.superClass, node.body, node.decorators);
  } else if (isExportDefaultDeclaration(node)) {
    if (isExpression(node.declaration)) {
      return node.declaration;
    }

    if (!isReferencedDefinitionNode(node.declaration)) {
      throw new ExportDefaultNonReferencedDefinitionNode(node.declaration.type);
    }
    return getExpressionFromReferencedDefinitionNode(node.declaration);
  }
  return node;
}

const DefinitionNotFoundError = variant(
  'DefinitionNotFoundError',
  fields<{ reference: string }>()
);

function getOutOfScopeReferences(expression: Expression) {
  return Set<LocalName>().withMutations(references => {
    traverse(
      file(program([expressionStatement(expression)]), undefined, undefined),
      {
        // @ts-ignore
        ReferencedIdentifier(referencePath: NodePath<Identifier>) {
          if (
            !references.has(referencePath.node.name) &&
            !referencePath.scope.getBinding(referencePath.node.name)
          ) {
            references.add(referencePath.node.name);
          }
        },
      }
    );
  });
}

function getReferencesFromExpression(
  expression: Expression,
  uri: string,
  programPath: NodePath<Program>
) {
  return Map(
    getOutOfScopeReferences(expression)
      .flatMap(reference => {
        const programBinding = programPath.scope.getBinding(reference);
        if (!programBinding) {
          if (globals.includes(reference)) {
            return [];
          } else {
            throw DefinitionNotFoundError({
              reference,
            });
          }
        }
        return [
          [reference, getCanonicalNameFromPath(programBinding.path, uri)] as [
            LocalName,
            CanonicalName
          ],
        ];
      })
      .toArray()
  );
}

function isMacroDefinition(
  definition: Definition
): definition is Definition<CallExpression> {
  return (
    isCallExpression(definition.expression) &&
    isIdentifier(definition.expression.callee) &&
    definition.references.has(definition.expression.callee.name) &&
    definition.references
      .get(definition.expression.callee.name)!
      .equals(CanonicalName({ uri: '@depno/core', name: 'createMacro' }))
  );
}

const ExpressionExpectedError = variant(
  'ExpressionExpectedError',
  fields<{ actualNodeType: string }>()
);

const CallExpressionExpectedError = variant(
  'CallExpressionExpectedError',
  fields<{ actualNodeType: string }>()
);

function assertExpression(node: Node): asserts node is Expression {
  if (!isExpression(node)) {
    throw ExpressionExpectedError({ actualNodeType: node.type });
  }
}

function assertCallExpression(node: Node): asserts node is CallExpression {
  if (!isExpression(node)) {
    throw CallExpressionExpectedError({ actualNodeType: node.type });
  }
}

function bundleCanonicalNamesFromBundle(
  bundle: Bundle,
  canonicalNames: Set<CanonicalName>
): Bundle {
  return canonicalNames.reduce((result, canonicalName) => {
    const definition = bundle.get(canonicalName);
    if (!definition) {
      throw DefinitionNotFoundInBundleError({ canonicalName, bundle });
    }
    return bundleCanonicalNamesFromBundle(
      result.set(canonicalName, definition),
      definition.references.valueSeq().toSet()
    );
  }, bundle);
}
