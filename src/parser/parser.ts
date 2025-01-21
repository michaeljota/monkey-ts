import type { Lexer } from "::lexer/lexer";
import { TokenType, type Token } from "::token";
import {
  Identifier,
  LetStatement,
  Program,
  ReturnStatement,
  type Statement,
} from "::ast";

export class Parser {
  private currentToken!: Token;
  private peekToken!: Token;
  readonly errors: string[] = [];

  constructor(private readonly lexer: Lexer) {
    this.nextToken();
    this.nextToken();
  }

  nextToken(): void {
    this.currentToken = this.peekToken;
    this.peekToken = this.lexer.nextToken();
  }

  expectPeek(tokenType: TokenType): boolean {
    if (this.peekToken.type !== tokenType) {
      this.addExpectedTokenTypeError(tokenType);
      return false;
    }

    this.nextToken();
    return true;
  }

  addExpectedTokenTypeError(tokenType: TokenType): void {
    this.errors.push(
      `Next token expected to be ${tokenType}, but found ${this.peekToken.type} instead`
    );
  }

  parseProgram(): Program {
    const program = new Program();

    while (this.currentToken.type !== TokenType.EOF) {
      const statement = this.parseStatement();
      if (statement) {
        program.statements.push(statement);
      }

      this.nextToken();
    }

    return program;
  }

  parseStatement(): Maybe<Statement> {
    switch (this.currentToken.type) {
      case TokenType.LET:
        return this.parseLetStatement();
      case TokenType.RETURN:
        return this.parseReturnStatement();
    }
  }

  parseLetStatement(): Maybe<LetStatement> {
    const statement = new LetStatement(this.currentToken);

    if (!this.expectPeek(TokenType.IDENT)) {
      return;
    }

    statement.name = new Identifier({
      token: this.currentToken,
      value: this.currentToken.literal,
    });

    if (!this.expectPeek(TokenType.ASSIGN)) {
      return;
    }

    while (this.currentToken.type !== TokenType.SEMICOLON) {
      this.nextToken();
    }

    return statement;
  }

  parseReturnStatement(): Maybe<ReturnStatement> {
    const statement = new ReturnStatement(this.currentToken);

    this.nextToken();

    while (this.currentToken.type !== TokenType.SEMICOLON) {
      this.nextToken();
    }

    return statement;
  }
}
