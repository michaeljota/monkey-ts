import type { Token } from "::token";
import { AstExpressionType, AstStatementType, type Expression, type Statement } from "./types";

export class Program {
  constructor(readonly statements: Statement[]) {}

  toString(): string {
    return this.statements.join("");
  }
}

export class LetStatement implements Statement {
  type = AstStatementType.Let;

  constructor(
    private readonly token: Token,
    readonly name: Identifier,
    readonly value: Expression,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `${this.tokenLiteral()} ${this.name} = ${this.value};`;
  }
}

export class ReturnStatement implements Statement {
  type = AstStatementType.Return;

  constructor(
    private readonly token: Token,
    readonly returnValue: Expression,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `${this.tokenLiteral()} ${this.returnValue}`;
  }
}

export class BlockStatement implements Statement {
  type = AstStatementType.Block;

  constructor(
    private readonly token: Token,
    readonly statements: Statement[],
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return this.statements.join("");
  }
}

export class ExpressionStatement implements Statement {
  type = AstStatementType.Expression;
  constructor(
    private readonly token: Token,
    readonly expression: Expression,
  ) {}

  tokenLiteral(): string {
    return this.token.type;
  }

  toString(): string {
    return `${this.expression}`;
  }
}

export class Identifier implements Expression {
  type = AstExpressionType.Identifier;

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
  type = AstExpressionType.IntegerLiteral;

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

export class PrefixExpression implements Expression {
  type = AstExpressionType.Prefix;

  constructor(
    private readonly token: Token,
    readonly operator: string,
    readonly right: Expression,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.operator}${this.right})`;
  }
}

export class InfixExpression implements Expression {
  type = AstExpressionType.Infix;

  constructor(
    private readonly token: Token,
    readonly right: Expression,
    readonly operator: string,
    readonly left: Expression,
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `(${this.left} ${this.operator} ${this.right})`;
  }
}

export class BooleanLiteral implements Expression {
  type = AstExpressionType.Boolean;

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
  type = AstExpressionType.If;

  constructor(
    private readonly token: Token,
    readonly condition: Expression,
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
  type = AstExpressionType.Function;
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
  type = AstExpressionType.Call;

  constructor(
    private readonly token: Token,
    readonly functionIdentifier: Expression,
    readonly functionArguments: Expression[],
  ) {}

  tokenLiteral(): string {
    return this.token.literal;
  }

  toString(): string {
    return `${this.functionIdentifier} (${this.functionArguments.join(", ")})`;
  }
}
