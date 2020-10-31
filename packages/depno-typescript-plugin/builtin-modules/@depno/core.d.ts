export type ASTNode<Type extends string> = {
  type: Type;
};

export type StringLiteral = ASTNode<"StringLiteral"> & {
  value: string;
};

export type Identifier = ASTNode<"Identifier"> & {
  name: any;
};

export type V8IntrinsicIdentifier = ASTNode<"V8IntrinsicIdentifier"> & {
  name: string;
};

export type RestElement = ASTNode<"RestElement"> & {
  argument: LVal;
};

export type Pattern = AssignmentPattern | ArrayPattern | ObjectPattern;

export type Expression =
  | ArrayExpression
  | AssignmentExpression
  | BinaryExpression
  | CallExpression
  | ConditionalExpression
  | FunctionExpression
  | Identifier
  | StringLiteral
  | NumericLiteral
  | NullLiteral
  | BooleanLiteral
  | RegExpLiteral
  | LogicalExpression
  | MemberExpression
  | NewExpression
  | ObjectExpression
  | SequenceExpression
  | ParenthesizedExpression
  | ThisExpression
  | UnaryExpression
  | UpdateExpression
  | ArrowFunctionExpression
  | ClassExpression
  | MetaProperty
  | Super
  | TaggedTemplateExpression
  | TemplateLiteral
  | YieldExpression
  | JSXElement
  | JSXFragment
  | AwaitExpression
  | BindExpression
  | OptionalMemberExpression
  | PipelinePrimaryTopicReference
  | OptionalCallExpression
  | Import
  | DoExpression
  | BigIntLiteral
  | RecordExpression
  | TupleExpression;

export type Super = ASTNode<"Super"> & {};

export type MetaProperty = ASTNode<"MetaProperty"> & {
  meta: any;
  property: Identifier;
};

export type JSXAttribute = ASTNode<"JSXAttribute"> & {
  name: JSXIdentifier | JSXNamespacedName;
  value:
    | JSXElement
    | JSXFragment
    | StringLiteral
    | JSXExpressionContainer
    | null;
};

export type JSXClosingElement = ASTNode<"JSXClosingElement"> & {
  name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName;
};

export type JSXElement = ASTNode<"JSXElement"> & {
  openingElement: JSXOpeningElement;
  closingElement: JSXClosingElement | null;
  children: Array<
    JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment
  >;
  selfClosing: any;
};

export type JSXOpeningElement = ASTNode<"JSXOpeningElement"> & {
  name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName;
  attributes: Array<JSXAttribute | JSXSpreadAttribute>;
  selfClosing: boolean;
};

export type JSXSpreadAttribute = ASTNode<"JSXSpreadAttribute"> & {
  argument: Expression;
};

export type JSXText = ASTNode<"JSXText"> & {
  value: string;
};

export type JSXFragment = ASTNode<"JSXFragment"> & {
  openingFragment: JSXOpeningFragment;
  closingFragment: JSXClosingFragment;
  children: Array<
    JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment
  >;
};

export type JSXOpeningFragment = ASTNode<"JSXOpeningFragment"> & {};

export type JSXClosingFragment = ASTNode<"JSXClosingFragment"> & {};

export type JSXEmptyExpression = ASTNode<"JSXEmptyExpression"> & {};

export type JSXExpressionContainer = ASTNode<"JSXExpressionContainer"> & {
  expression: Expression | JSXEmptyExpression;
};

export type JSXSpreadChild = ASTNode<"JSXSpreadChild"> & {
  expression: Expression;
};

export type JSXMemberExpression = ASTNode<"JSXMemberExpression"> & {
  object: JSXMemberExpression | JSXIdentifier;
  property: JSXIdentifier;
};

export type DoExpression = ASTNode<"DoExpression"> & {
  body: BlockStatement;
};

export type RecordExpression = ASTNode<"RecordExpression"> & {
  properties: Array<ObjectProperty | ObjectMethod | SpreadElement>;
};

export type TupleExpression = ASTNode<"TupleExpression"> & {
  elements: Array<null | Expression | SpreadElement>;
};

export type Import = ASTNode<"Import"> & {};

export type OptionalCallExpression = ASTNode<"OptionalCallExpression"> & {
  callee: Expression;
  arguments: Array<Expression | SpreadElement | JSXNamespacedName>;
  optional: boolean;
};

export type PipelinePrimaryTopicReference = ASTNode<
  "PipelinePrimaryTopicReference"
> & {};

export type OptionalMemberExpression = ASTNode<"OptionalMemberExpression"> & {
  object: Expression;
  property: any;
  computed: boolean;
  optional: boolean;
};

export type AwaitExpression = ASTNode<"AwaitExpression"> & {
  argument: Expression;
};

export type BindExpression = ASTNode<"BindExpression"> & {
  object: any;
  callee: any;
};

export type BigIntLiteral = ASTNode<"BigIntLiteral"> & {
  value: string;
};

export type YieldExpression = ASTNode<"YieldExpression"> & {
  argument: Expression | null;
  delegate: any;
};

export type TaggedTemplateExpression = ASTNode<"TaggedTemplateExpression"> & {
  tag: Expression;
  quasi: TemplateLiteral;
};

export type TemplateElement = ASTNode<"TemplateElement"> & {
  value: { raw: string; cooked?: string };
  tail: boolean;
};

export type TemplateLiteral = ASTNode<"TemplateLiteral"> & {
  quasis: Array<TemplateElement>;
  expressions: Array<Expression>;
};

export type ArrowFunctionExpression = ASTNode<"ArrowFunctionExpression"> & {
  params: Array<Identifier | Pattern | RestElement>;
  body: BlockStatement | Expression;
  async: boolean;
  expression: boolean;
  generator: boolean;
};

export type ClassBody = ASTNode<"ClassBody"> & {
  body: Array<
    ClassMethod | ClassPrivateMethod | ClassProperty | ClassPrivateProperty
  >;
};

export type ClassPrivateProperty = ASTNode<"ClassPrivateProperty"> & {
  key: PrivateName;
  value: Expression | null;
};

export type PrivateName = ASTNode<"PrivateName"> & {
  id: Identifier;
};

export type ClassProperty = ASTNode<"ClassProperty"> & {
  key: Identifier | StringLiteral | NumericLiteral | Expression;
  value: Expression | null;
  computed: boolean;
  static: boolean;
  abstract: boolean | null;
  accessibility: "public" | "private" | "protected" | null;
  declare: boolean | null;
  definite: boolean | null;
  optional: boolean | null;
  readonly: boolean | null;
};

export type ClassPrivateMethod = ASTNode<"ClassPrivateMethod"> & {
  kind: "get" | "set" | "method" | "constructor";
  key: PrivateName;
  params: Array<Identifier | Pattern | RestElement>;
  body: BlockStatement;
  static: boolean;
  abstract: boolean | null;
  access: "public" | "private" | "protected" | null;
  accessibility: "public" | "private" | "protected" | null;
  async: boolean;
  computed: boolean;
  generator: boolean;
  optional: boolean | null;
  returnType: any;
  typeParameters: any;
};

export type ClassMethod = ASTNode<"ClassMethod"> & {
  kind: "get" | "set" | "method" | "constructor";
  key: Identifier | StringLiteral | NumericLiteral | Expression;
  params: Array<Identifier | Pattern | RestElement>;
  body: BlockStatement;
  computed: boolean;
  static: boolean;
  generator: boolean;
  async: boolean;
  abstract: boolean | null;
  access: "public" | "private" | "protected" | null;
  accessibility: "public" | "private" | "protected" | null;
  optional: boolean | null;
};

export type ClassImplements = ASTNode<"ClassImplements"> & {
  id: Identifier;
};

export type ClassExpression = ASTNode<"ClassExpression"> & {
  id: Identifier | null;
  superClass: Expression | null;
  body: ClassBody;
  implements: Array<ClassImplements> | null;
  mixins: any;
};
export type PatternLike =
  | Identifier
  | RestElement
  | AssignmentPattern
  | ArrayPattern
  | ObjectPattern;

export type BlockStatement = ASTNode<"BlockStatement"> & {
  body: Array<Statement>;
};

export type Statement =
  | BlockStatement
  | BreakStatement
  | ContinueStatement
  | DebuggerStatement
  | DoWhileStatement
  | EmptyStatement
  | ExpressionStatement
  | ForInStatement
  | ForStatement
  | FunctionDeclaration
  | IfStatement
  | LabeledStatement
  | ReturnStatement
  | SwitchStatement
  | ThrowStatement
  | TryStatement
  | VariableDeclaration
  | WhileStatement
  | WithStatement
  | ClassDeclaration
  | ForOfStatement
  | ImportDeclaration;

export type ForOfStatement = ASTNode<"ForOfStatement"> & {
  left: VariableDeclaration | LVal;
  right: Expression;
  body: Statement;
  await: boolean;
};

export type ClassDeclaration = ASTNode<"ClassDeclaration"> & {
  id: any;
  superClass: any;
  body: any;
  decorators: any;
  abstract: boolean | null;
  declare: boolean | null;
  implements: any;
  mixins: any;
};

export type WhileStatement = ASTNode<"WhileStatement"> & {
  test: Expression;
  body: Statement;
};

export type WithStatement = ASTNode<"WithStatement"> & {
  object: Expression;
  body: Statement;
};

export type ReturnStatement = ASTNode<"ReturnStatement"> & {
  argument: Expression | null;
};

export type SequenceExpression = ASTNode<"SequenceExpression"> & {
  expressions: Array<Expression>;
};

export type ParenthesizedExpression = ASTNode<"ParenthesizedExpression"> & {
  expression: Expression;
};

export type SwitchCase = ASTNode<"SwitchCase"> & {
  test: Expression | null;
  consequent: Array<Statement>;
};

export type SwitchStatement = ASTNode<"SwitchStatement"> & {
  discriminant: Expression;
  cases: Array<SwitchCase>;
};

export type ThisExpression = ASTNode<"ThisExpression"> & {};

export type ThrowStatement = ASTNode<"ThrowStatement"> & {
  argument: Expression;
};

export type CatchClause = ASTNode<"CatchClause"> & {
  param: Identifier | ArrayPattern | ObjectPattern | null;
  body: BlockStatement;
};

export type TryStatement = ASTNode<"TryStatement"> & {
  block: any;
  handler: CatchClause | null;
  finalizer: BlockStatement | null;
};

export type UnaryExpression = ASTNode<"UnaryExpression"> & {
  operator: "void" | "throw" | "delete" | "!" | "+" | "-" | "~" | "typeof";
  argument: Expression;
  prefix: boolean;
};

export type UpdateExpression = ASTNode<"UpdateExpression"> & {
  operator: "++" | "--";
  argument: Expression;
  prefix: boolean;
};

export type AssignmentPattern = ASTNode<"AssignmentPattern"> & {
  left: Identifier | ObjectPattern | ArrayPattern | MemberExpression;
  right: Expression;
};

export type ObjectPattern = ASTNode<"ObjectPattern"> & {
  properties: Array<RestElement | ObjectProperty>;
};

export type ArrayPattern = ASTNode<"ArrayPattern"> & {
  elements: Array<null | PatternLike>;
};

export type IfStatement = ASTNode<"IfStatement"> & {
  test: Expression;
  consequent: Statement;
  alternate: Statement | null;
};

export type LabeledStatement = ASTNode<"LabeledStatement"> & {
  label: Identifier;
  body: Statement;
};

export type ForInStatement = ASTNode<"ForInStatement"> & {
  left: VariableDeclaration | LVal;
  right: Expression;
  body: Statement;
};

export type ForStatement = ASTNode<"ForStatement"> & {
  init: VariableDeclaration | Expression | null;
  test: Expression | null;
  update: Expression | null;
  body: Statement;
};

export type FunctionDeclaration = ASTNode<"FunctionDeclaration"> & {
  id: Identifier | null;
  params: Array<Identifier | Pattern | RestElement>;
  body: BlockStatement;
  generator: boolean;
  async: boolean;
  declare: boolean | null;
};

export type ContinueStatement = ASTNode<"ContinueStatement"> & {
  label: Identifier | null;
};

export type DebuggerStatement = ASTNode<"DebuggerStatement"> & {};

export type DoWhileStatement = ASTNode<"DoWhileStatement"> & {
  test: Expression;
  body: Statement;
};

export type EmptyStatement = ASTNode<"EmptyStatement"> & {};

export type ExpressionStatement = ASTNode<"ExpressionStatement"> & {
  expression: Expression;
};

export type BreakStatement = ASTNode<"BreakStatement"> & {
  label: Identifier | null;
};

export type ObjectMethod = ASTNode<"ObjectMethod"> & {
  kind: "method" | "get" | "set";
  key: any;
  params: Array<Identifier | Pattern | RestElement>;
  body: BlockStatement;
  computed: boolean;
  generator: boolean;
  async: boolean;
};

export type ObjectProperty = ASTNode<"ObjectProperty"> & {
  key: any;
  value: Expression | PatternLike;
  computed: boolean;
  shorthand: any;
};

export type ObjectExpression = ASTNode<"ObjectExpression"> & {
  properties: Array<ObjectMethod | ObjectProperty | SpreadElement>;
};

export type NewExpression = ASTNode<"NewExpression"> & {
  callee: Expression | V8IntrinsicIdentifier;
  arguments: Array<
    Expression | SpreadElement | JSXNamespacedName | ArgumentPlaceholder
  >;
  optional: true | false | null;
};

export type ArgumentPlaceholder = ASTNode<"ArgumentPlaceholder"> & {};

export type NumericLiteral = ASTNode<"NumericLiteral"> & {
  value: number;
};

export type NullLiteral = ASTNode<"NullLiteral"> & {};

export type BooleanLiteral = ASTNode<"BooleanLiteral"> & {
  value: boolean;
};

export type RegExpLiteral = ASTNode<"RegExpLiteral"> & {
  pattern: string;
  flags: any;
};

export type LogicalExpression = ASTNode<"LogicalExpression"> & {
  operator: "||" | "&&" | "??";
  left: Expression;
  right: Expression;
};

export type FunctionExpression = ASTNode<"FunctionExpression"> & {
  id: Identifier | null;
  params: Array<Identifier | Pattern | RestElement>;
  body: BlockStatement;
  generator: boolean;
  async: boolean;
};

export type ConditionalExpression = ASTNode<"ConditionalExpression"> & {
  test: Expression;
  consequent: Expression;
  alternate: Expression;
};

export type AssignmentExpression = ASTNode<"AssignmentExpression"> & {
  operator: string;
  left: LVal;
  right: Expression;
};

export type JSXIdentifier = ASTNode<"JSXIdentifier"> & {
  name: string;
};

export type JSXNamespacedName = ASTNode<"JSXNamespacedName"> & {
  namespace: JSXIdentifier;
  name: JSXIdentifier;
};

export type CallExpression = ASTNode<"CallExpression"> & {
  callee: Expression | V8IntrinsicIdentifier;
  arguments: Array<
    Expression | SpreadElement | JSXNamespacedName | ArgumentPlaceholder
  >;
  optional: true | false | null;
};

export type BinaryExpression = ASTNode<"BinaryExpression"> & {
  operator:
    | "+"
    | "-"
    | "/"
    | "%"
    | "*"
    | "**"
    | "&"
    | "|"
    | ">>"
    | ">>>"
    | "<<"
    | "^"
    | "=="
    | "==="
    | "!="
    | "!=="
    | "in"
    | "instanceof"
    | ">"
    | "<"
    | ">="
    | "<=";
  left: Expression;
  right: Expression;
};

export type MemberExpression = ASTNode<"MemberExpression"> & {
  object: Expression;
  property: any;
  computed: boolean;
  optional: true | false | null;
};

export type ArrayExpression = ASTNode<"ArrayExpression"> & {
  elements: Array<null | Expression | SpreadElement>;
};

export type SpreadElement = ASTNode<"SpreadElement"> & {
  argument: Expression;
};

export type LVal =
  | Identifier
  | MemberExpression
  | RestElement
  | AssignmentPattern
  | ArrayPattern
  | ObjectPattern;

export type ImportSpecifier = ASTNode<"ImportSpecifier"> & {
  local: Identifier;
  imported: Identifier;
  importKind: "type" | "typeof" | null;
};

export type ImportDeclaration = ASTNode<"ImportDeclaration"> & {
  specifiers: Array<ImportSpecifier>;
  source: StringLiteral;
  importKind: "type" | "typeof" | "value" | null;
};

export type VariableDeclarator = ASTNode<"VariableDeclarator"> & {
  id: LVal;
  init: Expression | null;
  definite: boolean | null;
};

export type VariableDeclaration = ASTNode<"VariableDeclaration"> & {
  kind: "var" | "let" | "const";
  declarations: Array<VariableDeclarator>;
  declare: boolean | null;
};

export type CanonicalDefinitionAST =
  | ImportDeclaration
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration;

export type WithReferences = {
  references: Map<string, Definition>;
};

export type Definition = WithReferences & {
  ast: CanonicalDefinitionAST;
};

export type Bundle = {
  definitions: Map<string, Definition>;
};

export type ExecutionBundle = Bundle & {
  executeExpression: WithReferences & {
    ast: Expression;
  };
};

export type Awaitable<T> = T | Promise<T>;

export function createMacro<T>(
  macroFn: (...args: ExecutionBundle[]) => Awaitable<ExecutionBundle>
): T;

export function executeBundle(bundle: ExecutionBundle): Awaitable<unknown>;
