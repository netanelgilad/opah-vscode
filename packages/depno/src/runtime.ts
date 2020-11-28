import { ExecutionBundle } from './Bundle';
import { generateCodeFromBundle } from './generateCodeFromBundle';

export function executeBundle(bundle: ExecutionBundle) {
  const code = generateCodeFromBundle(bundle);
  return eval(code);
}
