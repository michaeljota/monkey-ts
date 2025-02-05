import type { Token } from "::token";
import {
  AstExpressionType,
  AstProgramType,
  AstStatementType,
  type Expression,
  type Statement,
} from "./types";

export type NodeUnion = Program | ExpressionUnion | StatementUnion;

export type ExpressionUnion =
  | ArrayLiteral
  | BooleanLiteral
  | CallExpression
  | FunctionLiteral
  | Identifier
  | IfExpression
  | IndexExpression
  | InfixExpression
  | IntegerLiteral
  | PrefixExpression
  | StringLiteral;

export type StatementUnion = BlockStatement | ExpressionStatement | LetStatement | ReturnStatement;

export class Program {
  readonly type = AstProgramType.Program;

  constructor(readonly statements: StatementUnion[]) {}

  toString(): string {
    return this.statements.join("");
  }
}

export class LetStatement implements Statement {
  readonly type = AstStatementType.Let;

  constructor(
    private readonly token: Token,
    readonly name: Identifier,
    readonly value: ExpressionUnion,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `${this.tokenLiteral()} ${this.name} = ${this.value};`;
  }
}

export class ReturnStatement implements Statement {
  readonly type = AstStatementType.Return;

  constructor(
    private readonly token: Token,
    readonly returnValue: ExpressionUnion,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `${this.tokenLiteral()} ${this.returnValue}`;
  }
}

export class BlockStatement implements Statement {
  readonly type = AstStatementType.Block;

  constructor(
    private readonly token: Token,
    readonly statements: StatementUnion[],
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return this.statements.join("");
  }
}

export class ExpressionStatement implements Statement {
  readonly type = AstStatementType.Expression;

  constructor(
    private readonly token: Token,
    readonly expression: ExpressionUnion,
  ) {}

  tokenLiteral(): string {
    return this.token.type;
  }

  toString(): string {
    return `${this.expression}`;
  }
}

export class Identifier implements Expression {
  readonly type = AstExpressionType.Identifier;

  constructor(
    private readonly token: Token,
    readonly value: string,
  ) {
    this.value = value;
  }

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return this.value;
  }
}

export class IntegerLiteral implements Expression {
  readonly type = AstExpressionType.Integer;

  constructor(
    private readonly token: Token,
    readonly value: number,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return this.tokenLiteral();
  }
}

export class StringLiteral implements Expression {
  readonly type = AstExpressionType.String;

  constructor(
    private readonly token: Token,
    readonly value: string,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return this.token.literal;
  }
}

export class ArrayLiteral implements Expression {
  readonly type = AstExpressionType.Array;

  constructor(
    private readonly token: Token,
    readonly elements: ExpressionUnion[],
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `[${this.elements.join(",")}]`;
  }
}

export class IndexExpression implements Expression {
  readonly type = AstExpressionType.Index;

  constructor(
    private readonly token: Token,
    readonly left: ExpressionUnion,
    readonly index: ExpressionUnion,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.left}[${this.index}])`;
  }
}

export class PrefixExpression implements Expression {
  readonly type = AstExpressionType.Prefix;

  constructor(
    private readonly token: Token,
    readonly operator: string,
    readonly right: ExpressionUnion,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.operator}${this.right})`;
  }
}

export class InfixExpression implements Expression {
  readonly type = AstExpressionType.Infix;

  constructor(
    private readonly token: Token,
    readonly right: ExpressionUnion,
    readonly operator: string,
    readonly left: ExpressionUnion,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.left} ${this.operator} ${this.right})`;
  }
}

export class BooleanLiteral implements Expression {
  readonly type = AstExpressionType.Boolean;

  constructor(
    private readonly token: Token,
    readonly value: boolean,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return this.token.literal;
  }
}

export class IfExpression implements Expression {
  readonly type = AstExpressionType.If;

  constructor(
    private readonly token: Token,
    readonly condition: ExpressionUnion,
    readonly consequence: BlockStatement,
    readonly alternative: Maybe<BlockStatement>,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    const alternative = this.alternative ? ` else ${this.alternative}` : "";
    return `if ${this.condition} ${this.consequence}${alternative}`;
  }
}

export class FunctionLiteral implements Expression {
  readonly type = AstExpressionType.Function;

  constructor(
    private readonly token: Token,
    public readonly parameters: Identifier[],
    public readonly body: BlockStatement,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.parameters.join(",")}) ${this.body}`;
  }
}

export class CallExpression implements Expression {
  readonly type = AstExpressionType.Call;

  constructor(
    private readonly token: Token,
    readonly functionIdentifier: ExpressionUnion,
    readonly functionArguments: ExpressionUnion[],
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `${this.functionIdentifier} (${this.functionArguments.join(", ")})`;
  }
}
