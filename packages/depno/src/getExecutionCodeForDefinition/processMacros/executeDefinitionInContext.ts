import { Definition } from '../../Definition';
import { getExecutionCodeForDefinition } from '../getExecutionCodeForDefinition';

export async function executeDefinitionInContext(definition: Definition) {
  const code = await getExecutionCodeForDefinition(definition);
  return eval(code);
}
