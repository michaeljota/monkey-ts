import type { Token } from "::token";
import {
  AstExpressionType,
  AstStatementType,
  type Expression,
  type Node,
  type Statement,
} from "./types";

type Props<T, U> = Omit<T, keyof U>;
type StatementProps<T extends Statement> = Props<T, Statement>;
type ExpressionProps<T extends Expression> = Props<T, Expression>;

export class Program implements Node {
  statements: Statement[] = [];

  tokenLiteral(): string {
    const [statement] = this.statements;
    if (!statement) {
      return "";
    }

    return statement.tokenLiteral();
  }

  toString(): string {
    return this.statements.join("");
  }
}

export class LetStatement implements Statement {
  type = AstStatementType.Let;
  name: Identifier;
  value!: Expression;

  constructor(
    private readonly token: Token,
    // TODO: Remove Partial after update
    { name, value }: Partial<StatementProps<LetStatement>> = {}
  ) {
    this.name = name!;

    if (value) {
      this.value = value;
    }
  }

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `${this.tokenLiteral()} ${this.name} = ${this.value};`;
  }
}

export class ReturnStatement implements Statement {
  type = AstStatementType.Return;
  returnValue!: Expression;

  constructor(private readonly token: Token) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    // TODO: Remove conditional access
    return `${this.tokenLiteral()} ${this.returnValue ?? ""}`;
  }
}

export class ExpressionStatement implements Statement {
  type = AstStatementType.Expression;
  expression: Expression;

  constructor(
    private readonly token: Token,
    { expression }: StatementProps<ExpressionStatement>
  ) {
    this.expression = expression;
  }

  tokenLiteral(): string {
    return this.token.type;
  }

  toString(): string {
    // TODO: Remove conditional access
    return `${this.expression ?? ""}`;
  }
}

export class Identifier implements Expression {
  type = AstExpressionType.Identifier;
  value: string;

  constructor(
    private readonly token: Token,
    { value }: ExpressionProps<Identifier>
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
  type = AstExpressionType.IntegerLiteral;
  value: number;

  constructor(
    private readonly token: Token,
    { value }: ExpressionProps<IntegerLiteral>
  ) {
    this.value = value;
  }

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return this.tokenLiteral();
  }
}

export class PrefixExpression implements Expression {
  type = AstExpressionType.Prefix;
  operator: string;
  right: Expression;

  constructor(
    private readonly token: Token,
    { operator, right }: ExpressionProps<PrefixExpression>
  ) {
    this.operator = operator;
    this.right = right;
  }

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.operator}${this.right})`;
  }
}

export class InfixExpression implements Expression {
  type = AstExpressionType.Infix;
  operator: string;
  right: Expression;
  left: Expression;

  constructor(
    private readonly token: Token,
    { operator, right, left }: ExpressionProps<InfixExpression>
  ) {
    this.operator = operator;
    this.right = right;
    this.left = left;
  }

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.left} ${this.operator} ${this.right})`;
  }
}
