import type { Lexer } from "::lexer/lexer";
import { TokenType, type Token } from "::token";
import {
  ArrayLiteral,
  BlockStatement,
  BooleanLiteral,
  CallExpression,
  ExpressionPrecedence,
  ExpressionStatement,
  FunctionLiteral,
  HashLiteral,
  Identifier,
  IfExpression,
  IndexExpression,
  InfixExpression,
  IntegerLiteral,
  LetStatement,
  PrefixExpression,
  Program,
  ReturnStatement,
  StringLiteral,
  TokenOperatorPrecedences,
  type ExpressionUnion,
  type StatementUnion,
} from "::ast";

import type { TokenTypeDictionary, PrefixParserFn, InfixParserFn } from "./types";

export class Parser {
  private currentToken!: Token;
  private peekToken!: Token;

  private readonly prefixParserFns: TokenTypeDictionary<PrefixParserFn> = {};
  private readonly infixParserFns: TokenTypeDictionary<InfixParserFn> = {};
  readonly errors: string[] = [];

  get currentPrecedence(): ExpressionPrecedence {
    return TokenOperatorPrecedences[this.currentToken.type] ?? ExpressionPrecedence.LOWEST;
  }

  get peekPrecedence(): ExpressionPrecedence {
    return TokenOperatorPrecedences[this.peekToken.type] ?? ExpressionPrecedence.LOWEST;
  }

  constructor(private readonly lexer: Lexer) {
    this.nextToken();
    this.nextToken();

    this.registerPrefixParser(TokenType.IDENT, this.parseIdentifier);
    this.registerPrefixParser(TokenType.INT, this.parseIntegerLiteral);
    this.registerPrefixParser(TokenType.STRING, this.parseStringLiteral);
    this.registerPrefixParser(TokenType.BANG, this.parsePrefixExpression);
    this.registerPrefixParser(TokenType.MINUS, this.parsePrefixExpression);
    this.registerPrefixParser(TokenType.TRUE, this.parseBooleanExpression);
    this.registerPrefixParser(TokenType.FALSE, this.parseBooleanExpression);
    this.registerPrefixParser(TokenType.LPAREN, this.parseGroupedExpression);
    this.registerPrefixParser(TokenType.IF, this.parseIfExpression);
    this.registerPrefixParser(TokenType.FUNCTION, this.parseFunctionLiteral);
    this.registerPrefixParser(TokenType.LBRACKET, this.parseArrayLiteral);
    this.registerPrefixParser(TokenType.LBRACE, this.parseHashLiteral);

    this.registerInfixParser(TokenType.EQ, this.parseInfixExpression);
    this.registerInfixParser(TokenType.NOT_EQ, this.parseInfixExpression);
    this.registerInfixParser(TokenType.LT, this.parseInfixExpression);
    this.registerInfixParser(TokenType.GT, this.parseInfixExpression);
    this.registerInfixParser(TokenType.PLUS, this.parseInfixExpression);
    this.registerInfixParser(TokenType.MINUS, this.parseInfixExpression);
    this.registerInfixParser(TokenType.SLASH, this.parseInfixExpression);
    this.registerInfixParser(TokenType.ASTERISK, this.parseInfixExpression);
    this.registerInfixParser(TokenType.LPAREN, this.parseCallExpression);
    this.registerInfixParser(TokenType.LBRACKET, this.parseIndexExpression);
  }

  nextToken(): void {
    this.currentToken = this.peekToken;
    this.peekToken = this.lexer.nextToken();
  }

  expectPeek(tokenType: TokenType): boolean {
    if (this.peekToken.type !== tokenType) {
      this.errors.push(
        `Next token expected to be ${tokenType}, but found ${this.peekToken.type} instead.`,
      );
      return false;
    }

    this.nextToken();
    return true;
  }

  parseProgram(): Program {
    const statements: StatementUnion[] = [];

    while (this.currentToken.type !== TokenType.EOF) {
      const statement = this.parseStatement();
      if (statement) {
        statements.push(statement);
      }

      this.nextToken();
    }

    return new Program(statements);
  }

  parseStatement(): Maybe<StatementUnion> {
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
    const token = this.currentToken;

    if (!this.expectPeek(TokenType.IDENT)) {
      return;
    }

    const name = new Identifier(this.currentToken, this.currentToken.literal);

    if (!this.expectPeek(TokenType.ASSIGN)) {
      return;
    }

    this.nextToken();

    const value = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (!value) {
      return;
    }

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return new LetStatement(token, name, value);
  }

  parseReturnStatement(): Maybe<ReturnStatement> {
    const token = this.currentToken;

    this.nextToken();

    const returnValue = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (!returnValue) {
      return;
    }

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    return new ReturnStatement(token, returnValue);
  }

  parseExpressionStatement(): Maybe<ExpressionStatement> {
    const token = this.currentToken;
    const expression = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (this.peekToken.type === TokenType.SEMICOLON) {
      this.nextToken();
    }

    if (!expression) {
      return;
    }

    return new ExpressionStatement(token, expression);
  }

  parseExpression(precedence: ExpressionPrecedence): Maybe<ExpressionUnion> {
    const prefixParser = this.prefixParserFns[this.currentToken.type];

    if (!prefixParser) {
      this.errors.push(`No prefix parser found for ${this.currentToken.type}.`);
      return;
    }

    let leftExpression = prefixParser();

    while (this.peekToken.type !== TokenType.SEMICOLON && precedence < this.peekPrecedence) {
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
    return new Identifier(this.currentToken, this.currentToken.literal);
  };

  parseIntegerLiteral: PrefixParserFn = () => {
    const value = Number.parseInt(this.currentToken.literal, 10);
    const coercionChecker = Number(this.currentToken.literal);

    if (Number.isNaN(value) || Number.isNaN(coercionChecker)) {
      this.errors.push(`Could not parse ${value} as integer`);
      return;
    }

    return new IntegerLiteral(this.currentToken, value);
  };

  parseStringLiteral: PrefixParserFn = () => {
    return new StringLiteral(this.currentToken, this.currentToken.literal);
  };

  parseBooleanExpression: PrefixParserFn = () => {
    const value =
      this.currentToken.type === TokenType.TRUE
        ? true
        : this.currentToken.type === TokenType.FALSE
          ? false
          : undefined;

    if (value == null) {
      this.errors.push(`Could not parse ${value} as boolean`);
      return;
    }

    return new BooleanLiteral(this.currentToken, value);
  };

  parseGroupedExpression: PrefixParserFn = () => {
    this.nextToken();
    const expression = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (!this.expectPeek(TokenType.RPAREN)) {
      return;
    }

    return expression;
  };

  parseIfExpression: PrefixParserFn = () => {
    const token = this.currentToken;
    if (!this.expectPeek(TokenType.LPAREN)) {
      return;
    }
    this.nextToken();
    const condition = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (!condition) {
      return;
    }

    if (!this.expectPeek(TokenType.RPAREN)) {
      return;
    }

    const consequence = this.parseBlockStatement();

    if (!consequence) {
      return;
    }

    let alternative: Maybe<BlockStatement>;

    if (this.peekToken.type === TokenType.ELSE) {
      this.nextToken();

      alternative = this.parseBlockStatement();
    }

    return new IfExpression(token, condition, consequence, alternative);
  };

  parseBlockStatement(): Maybe<BlockStatement> {
    if (!this.expectPeek(TokenType.LBRACE)) {
      return;
    }
    const token = this.currentToken;
    let statements: StatementUnion[] = [];

    this.nextToken();

    while (this.currentToken.type !== TokenType.RBRACE) {
      const statement = this.parseStatement();
      if (statement) {
        statements.push(statement);
      }
      this.nextToken();
    }

    return new BlockStatement(token, statements);
  }

  parseFunctionLiteral: PrefixParserFn = () => {
    const token = this.currentToken;

    const parameters = this.parseFunctionParameters();
    if (!parameters) {
      return;
    }

    const body = this.parseBlockStatement();
    if (!body) {
      return;
    }

    return new FunctionLiteral(token, parameters, body);
  };

  parseFunctionParameters(): Maybe<Identifier[]> {
    if (!this.expectPeek(TokenType.LPAREN)) {
      return;
    }

    this.nextToken();

    if (this.currentToken.type === TokenType.RPAREN) {
      return [];
    }

    const identifiers: Identifier[] = [];

    const identifier = new Identifier(this.currentToken, this.currentToken.literal);

    identifiers.push(identifier);

    while (this.peekToken.type === TokenType.COMMA) {
      this.nextToken();
      this.nextToken();

      const identifier = new Identifier(this.currentToken, this.currentToken.literal);

      identifiers.push(identifier);
    }

    if (!this.expectPeek(TokenType.RPAREN)) {
      return;
    }

    return identifiers;
  }

  parseArrayLiteral: PrefixParserFn = () => {
    const token = this.currentToken;
    const elements = this.parseExpressionList(TokenType.RBRACKET);
    if (!elements) {
      return;
    }
    return new ArrayLiteral(token, elements);
  };

  parseHashLiteral: PrefixParserFn = () => {
    const token = this.currentToken;
    const pairs = new Map<ExpressionUnion, ExpressionUnion>();

    while (this.peekToken.type !== TokenType.RBRACE) {
      this.nextToken();
      const key = this.parseExpression(ExpressionPrecedence.LOWEST);

      if (!key || !this.expectPeek(TokenType.COLON)) {
        return;
      }

      this.nextToken();

      const value = this.parseExpression(ExpressionPrecedence.LOWEST);

      if (!value) {
        return;
      }

      pairs.set(key, value);

      // @ts-ignore
      if (this.peekToken.type !== TokenType.RBRACE && !this.expectPeek(TokenType.COMMA)) {
        return;
      }
    }

    if (!this.expectPeek(TokenType.RBRACE)) {
    }

    return new HashLiteral(token, pairs);
  };

  parseCallExpression: InfixParserFn = (functionIdentifier) => {
    const token = this.currentToken;

    const functionArguments = this.parseExpressionList(TokenType.RPAREN);

    if (!functionArguments) {
      return;
    }

    return new CallExpression(token, functionIdentifier, functionArguments);
  };

  parseExpressionList(closerToken: TokenType): Maybe<ExpressionUnion[]> {
    if (this.peekToken.type === closerToken) {
      this.nextToken();

      return [];
    }

    this.nextToken();
    const callArguments: ExpressionUnion[] = [];
    const argument = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (!argument) {
      return;
    }
    callArguments.push(argument);

    while (this.peekToken.type === TokenType.COMMA) {
      this.nextToken();
      this.nextToken();
      const argument = this.parseExpression(ExpressionPrecedence.LOWEST);

      if (!argument) {
        return;
      }
      callArguments.push(argument);
    }

    if (!this.expectPeek(closerToken)) {
      return;
    }

    return callArguments;
  }

  parseIndexExpression: InfixParserFn = (left) => {
    const token = this.currentToken;

    this.nextToken();
    const index = this.parseExpression(ExpressionPrecedence.LOWEST);

    if (!this.expectPeek(TokenType.RBRACKET) || index == null) {
      return;
    }

    return new IndexExpression(token, left, index);
  };

  parsePrefixExpression: PrefixParserFn = () => {
    const currentToken = this.currentToken;
    const operator = this.currentToken.literal;

    this.nextToken();

    const right = this.parseExpression(ExpressionPrecedence.PREFIX);

    if (!right) {
      return;
    }

    return new PrefixExpression(currentToken, operator, right);
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

    return new InfixExpression(currentToken, right, operator, left);
  };

  registerPrefixParser(tokenType: TokenType, parser: PrefixParserFn) {
    this.prefixParserFns[tokenType] = parser;
  }

  registerInfixParser(tokenType: TokenType, parser: InfixParserFn) {
    this.infixParserFns[tokenType] = parser;
  }
}
