import { Chance } from 'chance';
import { fork } from 'child_process';
import { within } from '../test/assertions/Assertion';
import { hasExitedSuccessfulyWith as willExitSuccessfulyWith } from '../test/assertions/hasExitedSuccessfulyWith';
import { willExitSuccessfuly } from '../test/assertions/willExistSuccessfuly';
import { willPrint } from '../test/assertions/willPrint';
import { assertThat } from '../test/assertThat';
import { fixtureFile } from '../test/fixtureFile';
import { statefulTest } from '../test/statefulTest';

statefulTest(
  'should run a given function with given parameters from a typescript file',
  async function*() {
    const chance = new Chance();
    const expectedStdout = chance.string();
    const exportedFunctionName = chance.string({ pool: 'abcdef' });

    const tmpFilePath = yield* fixtureFile(
      `
			import {console} from "console";
      export const ${exportedFunctionName} = (text) => {
				console.log(text);
      }
			`
    );

    const childProcess = fork(
      require.resolve('.bin/ts-node'),
      [
        require.resolve('./bin.ts'),
        tmpFilePath,
        exportedFunctionName,
        JSON.stringify(expectedStdout),
      ],
      {
        stdio: 'pipe',
      }
    );
    yield () => childProcess.kill('SIGTERM');

    await assertThat(
      childProcess,
      willExitSuccessfulyWith(expectedStdout + '\n'),
      within(7000).milliseconds
    );
  }
);

statefulTest(
  'it should provide stdin and stdout to function when requested',
  async function*() {
    const chance = new Chance();
    const questionText = 'question';
    const answerText = 'answer';
    const exportedFunctionName = chance.string({ pool: 'abcdef' });

    const tmpFilePath = yield* fixtureFile(
      `
			import {console} from "console";
			import { Readable, Writable } from "stream";
			import { createInterface } from "readline";
      export const ${exportedFunctionName} = (input: Readable, output: Writable) => {
        const rl = createInterface({
					input,
					output,
				});

				rl.question("${questionText}", (answer) => {
					output.write(answer);

					rl.close();
				});
      }
		`
    );

    const childProcess = fork(
      require.resolve('.bin/ts-node'),
      [
        require.resolve('./bin.ts'),
        tmpFilePath,
        exportedFunctionName,
        '{stdin}',
        '{stdout}',
      ],
      {
        stdio: 'pipe',
      }
    );
    yield () => childProcess.kill('SIGTERM');

    await assertThat(
      childProcess,
      willPrint(questionText),
      within(10000).milliseconds
    );

    childProcess.stdin.write(answerText + '\n');
    childProcess.stdin.end();

    await assertThat(
      childProcess,
      willPrint(answerText),
      within(10000).milliseconds
    );
    await assertThat(
      childProcess,
      willExitSuccessfuly,
      within(10000).milliseconds
    );
  }
);
