import { TokenType } from "::token";

export enum AstStatementType {
  Let,
  Return,
  Expression,
  Block,
}

export enum AstExpressionType {
  Identifier,
  IntegerLiteral,
  Prefix,
  Infix,
  Boolean,
  If,
  Function,
  Call,
}

export enum ExpressionPrecedence {
  LOWEST,
  EQUALS, // ==
  LESSGREATER, // > or <
  SUM, // +
  PRODUCT, // *
  PREFIX, // -X or !X,
  CALL, // foo(x)
}

export const TokenOperatorPrecedences: Partial<
  Record<TokenType, ExpressionPrecedence>
> = {
  [TokenType.EQ]: ExpressionPrecedence.EQUALS,
  [TokenType.NOT_EQ]: ExpressionPrecedence.EQUALS,
  [TokenType.LT]: ExpressionPrecedence.LESSGREATER,
  [TokenType.GT]: ExpressionPrecedence.LESSGREATER,
  [TokenType.PLUS]: ExpressionPrecedence.SUM,
  [TokenType.MINUS]: ExpressionPrecedence.SUM,
  [TokenType.SLASH]: ExpressionPrecedence.PRODUCT,
  [TokenType.ASTERISK]: ExpressionPrecedence.PRODUCT,
  [TokenType.LPAREN]: ExpressionPrecedence.CALL,
};

export interface Node {
  tokenLiteral(): string;
}

export interface Statement extends Node {
  type: AstStatementType;
}

export interface Expression extends Node {
  type: AstExpressionType;
}

export interface PrefixParserFn {
  (): Maybe<Expression>;
}

export interface InfixParserFn {
  (leftSideExpression: Expression): Maybe<Expression>;
}

export type TokenTypeDictionary<T> = Partial<Record<TokenType, T>>;
