import { Definition } from './Definition';
import { executeProgram } from './executeProgram';
import { getExecutionProgramForDefinition } from './getExecutionCodeForDefinition/getExecutionProgramForDefinition';

export async function executeDefinitionInContext(definition: Definition) {
  const program = await getExecutionProgramForDefinition(definition);
  return executeProgram(program);
}
