import { Chance } from 'chance';
import { fork } from 'child_process';
import { join } from 'path';
import { directory } from 'tempy';
import { otherwise, within } from '../../test/assertions/Assertion';
import {
  hasExitedSuccessfulyWith,
  hasExitedSuccessfulyWith as willExitSuccessfulyWith,
} from '../../test/assertions/hasExitedSuccessfulyWith';
import { willExitSuccessfuly } from '../../test/assertions/willExistSuccessfuly';
import { willPrint } from '../../test/assertions/willPrint';
import { assertThat } from '../../test/assertThat';
import { collectStreamChunks } from '../../test/collectStreamChunks';
import { fixtureFile } from '../../test/fixtureFile';
import { statefulTest } from '../../test/statefulTest';

const chance = new Chance();

statefulTest(
  'should run the default export from a typecript file',
  async function*() {
    const expectedStdout = chance.string();

    const tmpFilePath = yield* fixtureFile(`
			import {console} from "console";
			export default () => {
				const text: string = '${expectedStdout}';
				console.log(text);
			}
		`);

    const childProcess = fork(
      require.resolve('.bin/ts-node'),
      [require.resolve('./bin.ts'), tmpFilePath],
      {
        stdio: 'pipe',
      }
    );
    yield () => childProcess.kill('SIGTERM');

    await assertThat(
      childProcess,
      hasExitedSuccessfulyWith(expectedStdout + '\n')
    );
  }
);

statefulTest('should run a relative typecript file', async function*() {
  const tmpDirectory = directory();
  const expectedStdout = chance.string();

  yield* fixtureFile(
    `
			import {console} from "console";
			export default () => {
				const text: string = '${expectedStdout}';
				console.log(text);
			}
		`,
    join(tmpDirectory, './fileToRun.ts')
  );

  const childProcess = fork(
    require.resolve('.bin/ts-node'),
    [require.resolve('./bin.ts'), './fileToRun.ts'],
    {
      cwd: tmpDirectory,
      stdio: 'pipe',
    }
  );
  yield () => childProcess.kill('SIGTERM');

  await assertThat(
    childProcess,
    hasExitedSuccessfulyWith(expectedStdout + '\n')
  );
});

statefulTest(
  'should run the given const exported function from a file',
  async function*() {
    const expectedStdout = chance.string();
    const exportedFunctionName = chance.string({ pool: 'abcdef' });

    const tmpFilePath = yield* fixtureFile(
      `
			import {console} from "console";
			export const ${exportedFunctionName} = () => {
				const text: string = '${expectedStdout}';
				console.log(text);
			}
		`
    );

    const childProcess = fork(
      require.resolve('.bin/ts-node'),
      [require.resolve('./bin.ts'), tmpFilePath, exportedFunctionName],
      {
        stdio: 'pipe',
      }
    );
    yield () => childProcess.kill('SIGTERM');

    await assertThat(
      childProcess,
      hasExitedSuccessfulyWith(expectedStdout + '\n')
    );
  }
);

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
      within(10000).milliseconds
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
      within(10000).milliseconds,
      otherwise(async () => {
        return `stderr was: ${await collectStreamChunks(childProcess.stderr!)}`;
      })
    );

    childProcess.stdin!.write(answerText + '\n');
    childProcess.stdin!.end();

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