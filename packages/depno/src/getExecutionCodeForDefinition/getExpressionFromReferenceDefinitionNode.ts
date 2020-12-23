import {
  classExpression, Expression,


  functionExpression,
  isClassDeclaration,

  isExportDefaultDeclaration,
  isExpression, isFunctionDeclaration, isVariableDeclarator
} from '@babel/types';
import { isReferencedDefinitionNode } from '../isReferencedDefinitionNode';
import { ReferencedDefinitionNode } from './ReferencedDefinitionNode';

class NodeWithoutInitError extends Error {}
class ExportDefaultNonReferencedDefinitionNode extends Error {
  constructor(recievedNodeType: string) {
    super(
      `Found an export default of a non referenced definition node of type ${recievedNodeType}`
    );
  }
}

export function getExpressionFromReferencedDefinitionNode(
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
