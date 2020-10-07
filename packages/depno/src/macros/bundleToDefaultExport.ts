import { NodePath } from '@babel/traverse';
import {
  CallExpression,
  Identifier,
  program,
  templateElement,
  templateLiteral,
  exportDefaultDeclaration,
} from '@babel/types';
import generate from '@babel/generator';
import { bundleDefinitionsForPath } from '../bundleDefinitionsForPath';

export async function bundleToDefaultExport(
  currentURI: string,
  path: NodePath<Identifier>,
  state: any
) {
  const callExpression = path.parentPath as NodePath<CallExpression>;
  const toBundle = callExpression.get('arguments.0') as NodePath<
    CallExpression['arguments'][number]
  >;
  const definitions = await bundleDefinitionsForPath({
    pathToBundle: toBundle,
    isDefinition: false,
    programPath: state.file.path,
    currentURI,
    useCanonicalNames: false,
  });

  const bundledProgram = program(
    definitions.concat([exportDefaultDeclaration(toBundle.node as any)])
  );

  const code = generate(bundledProgram, {
    compact: true,
  }).code;
  path.parentPath.replaceWith(
    templateLiteral([templateElement({ raw: code })], [])
  );
}
