import { NodePath } from "@babel/core";
import traverse from "@babel/traverse";
import { File, Program } from "@babel/types";

export function getProgramPath(ast: File) {
  let programPath: NodePath<Program>;

  traverse(ast, {
    Program(program: NodePath<Program>) {
      programPath = program;
    },
  });

  return programPath!
}