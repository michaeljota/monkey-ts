import type { Token } from "::token";
import {
  AstExpressionType,
  AstStatementType,
  type Expression,
  type Node,
  type Statement,
} from "./types";

export class Program implements Node {
  statements: Statement[] = [];

  tokenLiteral(): string {
    const [statement] = this.statements;
    if (!statement) {
      return "";
    }

    return statement.tokenLiteral();
  }
}

export class LetStatement implements Statement {
  type = AstStatementType.Let;
  name!: Identifier;
  value!: Expression;

  constructor(private readonly token: Token) {}

  tokenLiteral(): string {
    return this.token.literal;
  }
}

export class Identifier implements Expression {
  type = AstExpressionType.Identifier;
  token: Token;
  value: string;

  constructor(identifier: Pick<Identifier, "token" | "value">) {
    this.token = identifier.token;
    this.value = identifier.value;
  }

  tokenLiteral(): string {
    return this.token.literal;
  }
}
