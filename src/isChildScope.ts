import { Scope } from '@babel/traverse';

export function isChildScope(
  possibleChild: Scope,
  possibleParent: Scope
): boolean {
  if (possibleChild === possibleParent) {
    return true;
  }
  if (!possibleChild.parent) {
    return false;
  }
  return isChildScope(possibleChild.parent, possibleParent);
}
