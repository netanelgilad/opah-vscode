import { Closure } from './Closure';
import { executeProgram } from './executeProgram';
import { getExecutionProgramForDefinition } from './getExecutionCodeForDefinition/getExecutionProgramForDefinition';

export async function executeClosureInContext(closure: Closure) {
  const program = await getExecutionProgramForDefinition(closure);
  return executeProgram(program);
}
