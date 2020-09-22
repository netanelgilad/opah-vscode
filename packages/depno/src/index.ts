import { ChildProcess, fork } from 'child_process';
import { NodePath } from '@babel/core';
import { file } from 'tempy';
import { writeFileSync } from 'fs';
import { File } from '@babel/types';
import * as types from '@babel/types';
import { resolve } from 'path';
import { bundlePath } from './bundlePath';
import { getContentsFromURI } from './getContentsFromURI';
import traverse from '@babel/traverse';
import { getASTFromCode } from './getASTFromCode';

export async function runFile(
  path: string,
  opts: {
    exportedFunctionName?: string;
    args?: any[];
    cwd?: string;
    silent?: boolean;
  } = {}
): Promise<ChildProcess> {
  const silent = opts.silent ?? true;
  const args = opts.args ?? [];
  const exportedFunctionName = opts.exportedFunctionName ?? 'default';
  const uri = path.startsWith('.')
    ? resolve(opts.cwd || process.cwd(), path)
    : path;

  const code = await getContentsFromURI(uri);

  const ast = await getASTFromCode(code, uri);

  const { program, node } = getDeclarationByName(
    (ast as unknown) as File,
    exportedFunctionName,
    uri
  );

  const functionToRunCode = await bundlePath(node, true, program, uri);

  return executeFunctionCode(functionToRunCode, args, opts.cwd, silent);
}

function getDeclarationByName(ast: File, name: string, uri: string) {
  let program: NodePath<types.Program>;
  let node: NodePath;

  if (name === 'default') {
    traverse((ast as unknown) as File, {
      Program(programPath) {
        program = programPath;
      },
      ExportDefaultDeclaration(exportDefaultPath) {
        node = exportDefaultPath;
        exportDefaultPath.stop();
      },
    });
  } else {
    traverse((ast as unknown) as File, {
      Program(programPath) {
        program = programPath;
        const dependencyBinding = programPath.scope.getBinding(name);
        if (!dependencyBinding) {
          throw new ReferenceError(
            `Failed to find binding for ${name} at ${uri}`
          );
        }
        node = dependencyBinding.path;
      },
    });
  }

  return {
    program: program!,
    node: node!,
  };
}

function executeFunctionCode(
  code: string,
  args: any[],
  cwd?: string,
  silent?: boolean
) {
  const tmpFile = file({ extension: 'js' });

  const mappedArgs = args.map(x => {
    if (x === '__stdin__') {
      return 'process.stdin';
    } else if (x === '__stdout__') {
      return 'process.stdout';
    } else {
      return JSON.stringify(x);
    }
  });

  writeFileSync(tmpFile, `eval(\`${code}\`)(${mappedArgs.join(',')})`);

  if (process.env.DEPNO_DEBUG) {
    console.log(tmpFile);
  }

  return fork(tmpFile, [], {
    cwd,
    silent,
    execArgv: ['--unhandled-rejections=strict'],
  });
}
