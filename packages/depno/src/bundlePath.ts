import { NodePath } from '@babel/core';
import { Binding } from '@babel/traverse';
import {
  CallExpression,
  Expression,
  expressionStatement,
  Identifier,
  isCallExpression,
  isIdentifier,
  isVariableDeclarator,
  Program,
  VariableDeclarator,
} from '@babel/types';
import { Bundle, CaononicalDefinitionNode, MacroFunction } from './Bundle';
import { bundleCanonicalName } from './bundleCanonicalName';
import { canonicalIdentifier, CanonicalName } from './fullyQualifiedIdentifier';
import { generateCodeFromBundle } from './generateCodeFromBundle';
import { getCanonicalDefinitionNode } from './getCanonicalDefinitionNode';
import { getCanonicalNameFromPath } from './getCanonicalNameFromPath';
import { isReferencedDefinitionNode } from './isReferencedDefinitionNode';
import { replaceReferencesWithCanonicalNamesInBundle } from './replaceReferencesWithCanonicalNamesInBundle';
import { validateBinding } from './validateBinding';

export async function bundlePath(
  pathToBundle: NodePath,
  programPath: NodePath<Program>,
  uri: string
): Promise<Bundle> {
  const references = getReferencesToCanonicalNames(pathToBundle, programPath);

  const referencesCanonicalNames = Array.from(references.entries()).map(
    ([binding, name]) =>
      [getCanonicalNameFromPath(binding.path, uri), binding, name] as const
  );

  const referencesToBundle = referencesCanonicalNames.filter(
    ([referenceCanonicalName]) =>
      !(
        referenceCanonicalName.uri === '@depno/macros' &&
        referenceCanonicalName.name === 'createMacro'
      )
  );

  const {
    definitions,
    macros,
    referencesInDefinitions,
  } = await getDefinitionsFromReferences(uri, referencesToBundle, programPath);

  // replaceReferencesWithCanonicalNames(uri, references);

  const canonicalName = getCanonicalNameFromPath(pathToBundle, uri);

  const referencesInDefinition = new Map(
    referencesCanonicalNames.map(([canonicalName, _, localName]) => {
      return [localName, canonicalName];
    })
  );

  if (isMacroPath(pathToBundle, referencesInDefinition)) {
    referencesInDefinitions.set(
      canonicalIdentifier(canonicalName),
      referencesInDefinition
    );
    const macroBundle = await replaceReferencesWithCanonicalNamesInBundle(
      {
        definitions,
        referencesInDefinitions,
        macros,
        expression: expressionStatement(
          pathToBundle.node.init.arguments[0] as Expression
        ),
      },
      referencesInDefinition
    );
    const code = await generateCodeFromBundle(macroBundle);
    const macroFunction = eval(code);
    macros.set(canonicalIdentifier(canonicalName), macroFunction);
  } else if (isReferencedDefinitionNode(pathToBundle.node)) {
    definitions.set(
      canonicalIdentifier(canonicalName),
      getCanonicalDefinitionNode(canonicalName, pathToBundle.node)
    );
    referencesInDefinitions.set(
      canonicalIdentifier(canonicalName),
      referencesInDefinition
    );
  }

  return { definitions, macros, referencesInDefinitions };
}

function getReferencesToCanonicalNames(
  path: NodePath,
  programPath: NodePath<Program>
): Map<Binding, string> {
  const references = new Map<Binding, string>();

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
          references.set(binding!, referencePath.node.name);
        }
      }
    },
  });

  return references;
}

async function getDefinitionsFromReferences(
  uri: string,
  referencesToBundle: Array<readonly [CanonicalName, Binding, string]>,
  programPath: NodePath<Program>
) {
  let definitions = new Map<string, CaononicalDefinitionNode>();
  let macros = new Map<string, MacroFunction>();
  let referencesInDefinitions = new Map<string, Map<string, CanonicalName>>();
  for (const [referenceCanonicalName, reference] of referencesToBundle) {
    let definitionsOfTheReference: Map<string, CaononicalDefinitionNode>;
    let referencesInDefinitionsOfTheReference: Map<
      string,
      Map<string, CanonicalName>
    >;
    let macrosOfTheReference: Map<string, MacroFunction>;

    if (!definitions.has(canonicalIdentifier(referenceCanonicalName))) {
      if (referenceCanonicalName.uri !== uri) {
        const bundleResult = await bundleCanonicalName(referenceCanonicalName);
        definitionsOfTheReference = bundleResult.definitions;
        macrosOfTheReference = bundleResult.macros;
        referencesInDefinitionsOfTheReference =
          bundleResult.referencesInDefinitions;
      } else {
        const bundleResult = await bundlePath(reference.path, programPath, uri);
        definitionsOfTheReference = bundleResult.definitions;
        macrosOfTheReference = bundleResult.macros;
        referencesInDefinitionsOfTheReference =
          bundleResult.referencesInDefinitions;
      }

      definitions = new Map([...definitions, ...definitionsOfTheReference]);
      macros = new Map([...macros, ...macrosOfTheReference]);
      referencesInDefinitions = new Map([
        ...referencesInDefinitions,
        ...referencesInDefinitionsOfTheReference,
      ]);
    }
  }
  return { definitions, macros, referencesInDefinitions };
}

function isMacroPath(
  path: NodePath,
  referencesInDefinition: Map<string, CanonicalName>
): path is NodePath<VariableDeclarator & { init: CallExpression }> {
  return (
    isVariableDeclarator(path.node) &&
    isCallExpression(path.node.init) &&
    isIdentifier(path.node.init.callee) &&
    referencesInDefinition.has(path.node.init.callee.name) &&
    canonicalIdentifier(
      referencesInDefinition.get(path.node.init.callee.name)!
    ) === canonicalIdentifier({ uri: '@depno/macros', name: 'createMacro' })
  );
}
