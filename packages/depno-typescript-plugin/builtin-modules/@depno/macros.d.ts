declare module "@depno/macros" {
  export type Node = unknown;
  export type Path<TNode extends Node> = {
    parentPath: Path<Node>;
    node: TNode;
    replaceWith(node: Node);
  };

  export type Identifier = Node & unknown;

  export type CallExpression = Node & {
    arguments: Node[];
  };

  export type MacroContext = {
    reference: Path<Identifier>;
    types: unknown;
    state: unknown;
  };
  export function createMacro<T>(
    macroFn: (context: MacroContext) => unknown
  ): T;

  export function canonicalName(node: any): string;
}
