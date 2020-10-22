import { NodePath } from '@babel/core';
import { Binding } from '@babel/traverse';
import {
  CallExpression,
  classDeclaration,
  ClassDeclaration,
  ExportDefaultDeclaration,
  Expression,
  functionDeclaration,
  FunctionDeclaration,
  functionExpression,
  identifier,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportSpecifier,
  isCallExpression,
  isClassDeclaration,
  isExportDefaultDeclaration,
  isFunctionDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportSpecifier,
  isVariableDeclarator,
  Node,
  Program,
  VariableDeclaration,
  variableDeclaration,
  VariableDeclarator,
  variableDeclarator,
} from '@babel/types';
import { unimplemented } from '@deaven/unimplemented';
import { bundleCanonicalName } from './bundleCanonicalName';
import {
  canonicalIdentifier,
  CanonicalName,
  fullyQualifiedIdentifier,
} from './fullyQualifiedIdentifier';
import { generateCodeFromBundle } from './generateCodeFromBundle';
import { resolveURIFromDependency } from './resolveURIFromDependency';
import { validateBinding } from './validateBinding';

export type ReferencedDefinitionNode =
  | VariableDeclarator
  | FunctionDeclaration
  | ClassDeclaration
  | ExportDefaultDeclaration;

export type CaononicalDefinitionNode =
  | ImportDeclaration
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration;

export type MacroFunction = (opts: {
  definitions: Map<string, CaononicalDefinitionNode>;
  types: typeof import('@babel/types');
  node: CallExpression;
  definitionCanonicalName: CanonicalName;
}) => {
  replacement?: Node;
  definitions?: Map<string, CaononicalDefinitionNode>;
};

export async function bundleDefinitionsForPath2(
  pathToBundle: NodePath,
  programPath: NodePath<Program>,
  uri: string
): Promise<{
  definitions: Map<string, CaononicalDefinitionNode>;
  macros: Map<string, MacroFunction>;
}> {
  const references = getReferencesToCanonicalNames(pathToBundle, programPath);

  const referencesCanonicalNames = Array.from(references.keys()).map(
    reference =>
      [getCanonicalNameFromPath(reference.path, uri), reference] as const
  );

  const referencesToBundle = referencesCanonicalNames.filter(
    ([referenceCanonicalName]) =>
      !(
        referenceCanonicalName.uri === '@depno/macros' &&
        referenceCanonicalName.name === 'createMacro'
      )
  );

  let { definitions, macros } = await getDefinitionsFromReferences(
    uri,
    referencesToBundle,
    programPath
  );

  replaceReferencesWithCanonicalNames(uri, references);

  const canonicalName = getCanonicalNameFromPath(pathToBundle, uri);

  if (isMacroPath(pathToBundle)) {
    const macroBundle = {
      definitions,
      macros,
      expression: pathToBundle.node.init.arguments[0] as Expression,
    };
    const code = await generateCodeFromBundle(macroBundle);
    const macroFunction = eval(code);
    macros.set(canonicalIdentifier(canonicalName), macroFunction);
  } else if (isReferencedDefinitionNode(pathToBundle.node)) {
    definitions.set(
      canonicalIdentifier(canonicalName),
      getCanonicalDefinitionNode(canonicalName, pathToBundle.node)
    );
  }

  return { definitions, macros };
}

function getReferencesToCanonicalNames(
  path: NodePath,
  programPath: NodePath<Program>
): Map<Binding, Array<NodePath>> {
  const references = new Map<Binding, Array<NodePath>>();

  path.traverse({
    // @ts-ignore
    ReferencedIdentifier(referencePath: NodePath<Identifier>) {
      const binding = referencePath.scope.getBinding(referencePath.node.name);
      if (
        validateBinding(binding, referencePath, programPath, path) &&
        binding!.path !== path
      ) {
        const existingPathsForCanonicalName = references.get(binding!);
        if (!existingPathsForCanonicalName) {
          references.set(binding!, [referencePath]);
        } else {
          existingPathsForCanonicalName.push(referencePath);
        }
      }
    },
  });

  return references;
}

function isPartOfImportStatement(
  node: Node
): node is ImportSpecifier | ImportDefaultSpecifier {
  return isImportSpecifier(node) || isImportDefaultSpecifier(node);
}

function getImportedFromSpecifier(
  node: ImportSpecifier | ImportDefaultSpecifier
) {
  if (isImportSpecifier(node)) {
    return node.imported.name as string;
  } else {
    return 'default';
  }
}

function isReferencedDefinitionNode(
  node: Node
): node is ReferencedDefinitionNode {
  return (
    isVariableDeclarator(node) ||
    isFunctionDeclaration(node) ||
    isClassDeclaration(node) ||
    isExportDefaultDeclaration(node)
  );
}

function getCanonicalDefinitionNode(
  canonicalName: CanonicalName,
  node: ReferencedDefinitionNode
): CaononicalDefinitionNode {
  if (isVariableDeclarator(node)) {
    return variableDeclaration('const', [
      variableDeclarator(
        identifier(canonicalIdentifier(canonicalName)),
        node.init
      ),
    ]);
  } else if (isFunctionDeclaration(node)) {
    return functionDeclaration(
      identifier(canonicalIdentifier(canonicalName)),
      node.params,
      node.body,
      node.generator,
      node.async
    );
  } else if (isClassDeclaration(node)) {
    return classDeclaration(
      identifier(canonicalIdentifier(canonicalName)),
      node.superClass,
      node.body,
      node.decorators
    );
  } else if (isExportDefaultDeclaration(node)) {
    return variableDeclaration('const', [
      variableDeclarator(
        identifier(canonicalIdentifier(canonicalName)),
        isFunctionDeclaration(node.declaration)
          ? functionExpression(
              node.declaration.id,
              node.declaration.params,
              node.declaration.body,
              node.declaration.generator,
              node.declaration.async
            )
          : (node.declaration as Expression)
      ),
    ]);
  } else {
    return unimplemented();
  }
}

function getCanonicalNameFromPath(path: NodePath, uri: string): CanonicalName {
  if (isPartOfImportStatement(path.node)) {
    const importSource = (path.parentPath as NodePath<ImportDeclaration>).node
      .source.value;
    const dependencyURI = resolveURIFromDependency(importSource, uri);
    return {
      uri: dependencyURI,
      name: getImportedFromSpecifier(path.node),
    };
  } else if (isReferencedDefinitionNode(path.node)) {
    return {
      uri: uri,
      name: isExportDefaultDeclaration(path.node)
        ? 'default'
        : path.node.id.name,
    };
  } else {
    return unimplemented();
  }
}

async function getDefinitionsFromReferences(
  uri: string,
  referencesToBundle: Array<readonly [CanonicalName, Binding]>,
  programPath: NodePath<Program>
) {
  let definitions = new Map<string, CaononicalDefinitionNode>();
  let macros = new Map<string, MacroFunction>();
  for (const [referenceCanonicalName, reference] of referencesToBundle) {
    let definitionsOfTheReference: Map<string, CaononicalDefinitionNode>;
    let macrosOfTheReference: Map<string, MacroFunction>;

    if (!definitions.has(canonicalIdentifier(referenceCanonicalName))) {
      if (referenceCanonicalName.uri !== uri) {
        const bundleResult = await bundleCanonicalName(referenceCanonicalName);
        definitionsOfTheReference = bundleResult.definitions;
        macrosOfTheReference = bundleResult.macros;
      } else {
        const bundleResult = await bundleDefinitionsForPath2(
          reference.path,
          programPath,
          uri
        );
        definitionsOfTheReference = bundleResult.definitions;
        macrosOfTheReference = bundleResult.macros;
      }

      definitions = new Map([...definitions, ...definitionsOfTheReference]);
      macros = new Map([...macros, ...macrosOfTheReference]);
    }
  }
  return { definitions, macros };
}

function replaceReferencesWithCanonicalNames(
  uri: string,
  references: Map<Binding, NodePath[]>
) {
  for (const [binding, dependencyReferences] of references) {
    for (const dependencyReference of dependencyReferences) {
      const dependencyReferenceCanonicalName = getCanonicalNameFromPath(
        binding.path,
        uri
      );
      dependencyReference.replaceWith(
        identifier(
          fullyQualifiedIdentifier(
            dependencyReferenceCanonicalName.uri,
            dependencyReferenceCanonicalName.name
          )
        )
      );
    }
  }
}

function isMacroPath(
  path: NodePath
): path is NodePath<VariableDeclarator & { init: CallExpression }> {
  return (
    isVariableDeclarator(path.node) &&
    isCallExpression(path.node.init) &&
    isIdentifier(path.node.init.callee) &&
    path.node.init.callee.name ===
      canonicalIdentifier({ uri: '@depno/macros', name: 'createMacro' })
  );
}
