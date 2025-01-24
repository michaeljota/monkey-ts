import type { Lexer } from "::lexer/lexer";
import { TokenType, type Token } from "::token";
import {
  ExpressionPrecedence,
  ExpressionStatement,
  Identifier,
  InfixExpression,
  IntegerLiteral,
  LetStatement,
  PrefixExpression,
  Program,
  ReturnStatement,
  TokenOperatorPrecedences,
  type Expression,
  type InfixParserFn,
  type PrefixParserFn,
  type Statement,
  type TokenTypeDictionary,
} from "::ast";

export class Parser {
  private currentToken!: Token;
  private peekToken!: Token;

  private readonly prefixParserFns: TokenTypeDictionary<PrefixParserFn> = {};
  private readonly infixParserFns: TokenTypeDictionary<InfixParserFn> = {};
  readonly errors: string[] = [];

  get currentPrecedence(): ExpressionPrecedence {
    return (
      TokenOperatorPrecedences[this.currentToken.type] ??
      ExpressionPrecedence.LOWEST
    );
  }

  get peekPrecedence(): ExpressionPrecedence {
    return (
      TokenOperatorPrecedences[this.peekToken.type] ??
      ExpressionPrecedence.LOWEST
    );
  }

  constructor(private readonly lexer: Lexer) {
    this.nextToken();
    this.nextToken();

    this.registerPrefixParser(TokenType.IDENT, this.parseIdentifier);
    this.registerPrefixParser(TokenType.INT, this.parseIntegerLiteral);
    this.registerPrefixParser(TokenType.BANG, this.parsePrefixExpression);
    this.registerPrefixParser(TokenType.MINUS, this.parsePrefixExpression);

    this.registerInfixParser(TokenType.EQ, this.parseInfixExpression);
    this.registerInfixParser(TokenType.NOT_EQ, this.parseInfixExpression);
    this.registerInfixParser(TokenType.LT, this.parseInfixExpression);
    this.registerInfixParser(TokenType.GT, this.parseInfixExpression);
    this.registerInfixParser(TokenType.PLUS, this.parseInfixExpression);
    this.registerInfixParser(TokenType.MINUS, this.parseInfixExpression);
    this.registerInfixParser(TokenType.SLASH, this.parseInfixExpression);
    this.registerInfixParser(TokenType.ASTERISK, this.parseInfixExpression);
  }

  nextToken(): void {
    this.currentToken = this.peekToken;
    this.peekToken = this.lexer.nextToken();
  }

  expectPeek(tokenType: TokenType): boolean {
    if (this.peekToken.type !== tokenType) {
      this.errors.push(
        `Next token expected to be ${tokenType}, but found ${this.peekToken.type} instead.`
      );
      return false;
    }

    this.nextToken();
    return true;
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
      default:
        return this.parseExpressionStatement();
    }
  }

  parseLetStatement(): Maybe<LetStatement> {
    const tokenType = this.currentToken;

    if (!this.expectPeek(TokenType.IDENT)) {
      return;
    }

    const name = new Identifier(this.currentToken, {
      value: this.currentToken.literal,
    });

    if (!this.expectPeek(TokenType.ASSIGN)) {
      return;
    }

    // TODO: Parse value
    while (this.currentToken.type !== TokenType.SEMICOLON) {
      this.nextToken();
    }

    return new LetStatement(tokenType, { name });
  }

  parseReturnStatement(): Maybe<ReturnStatement> {
    const statement = new ReturnStatement(this.currentToken);

    this.nextToken();

    while (this.currentToken.type !== TokenType.SEMICOLON) {
      this.nextToken();
    }

    return statement;
  }

  parseExpressionStatement(): Maybe<ExpressionStatement> {
    const currentToken = this.currentToken;
    const expression = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    if (!expression) {
      return;
    }

    return new ExpressionStatement(currentToken, { expression });
  }

  parseExpression(precedence: ExpressionPrecedence): Maybe<Expression> {
    const prefixParser = this.prefixParserFns[this.currentToken.type];

    if (!prefixParser) {
      this.errors.push(`No prefix parser found for ${this.currentToken.type}.`);
      return;
    }

    let leftExpression = prefixParser();

    while (
      this.peekToken.type !== TokenType.SEMICOLON &&
      precedence < this.peekPrecedence
    ) {
      const infixParser = this.infixParserFns[this.peekToken.type];

      if (!infixParser || !leftExpression) {
        return leftExpression;
      }

      this.nextToken();

      leftExpression = infixParser(leftExpression);
    }

    return leftExpression;
  }

  parseIdentifier: PrefixParserFn = () => {
    return new Identifier(this.currentToken, {
      value: this.currentToken.literal,
    });
  };

  parseIntegerLiteral: PrefixParserFn = () => {
    const value = Number.parseInt(this.currentToken.literal, 10);
    const coercionChecker = Number(this.currentToken.literal);

    if (Number.isNaN(value) || Number.isNaN(coercionChecker)) {
      this.errors.push(`Could not parse ${value} as integer`);
      return;
    }

    return new IntegerLiteral(this.currentToken, { value });
  };

  parsePrefixExpression: PrefixParserFn = () => {
    const currentToken = this.currentToken;
    const operator = this.currentToken.literal;

    this.nextToken();

    const right = this.parseExpression(ExpressionPrecedence.PREFIX);

    if (!right) {
      return;
    }

    return new PrefixExpression(currentToken, { operator, right });
  };

  parseInfixExpression: InfixParserFn = (left) => {
    const currentToken = this.currentToken;
    const operator = this.currentToken.literal;
    const precedence = this.currentPrecedence;
    this.nextToken();
    const right = this.parseExpression(precedence);

    if (!right) {
      return;
    }

    return new InfixExpression(currentToken, { operator, right, left });
  };

  registerPrefixParser(tokenType: TokenType, parser: PrefixParserFn) {
    this.prefixParserFns[tokenType] = parser;
  }

  registerInfixParser(tokenType: TokenType, parser: InfixParserFn) {
    this.infixParserFns[tokenType] = parser;
  }
}
