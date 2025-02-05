import { TokenType } from "::token";

export enum AstStatementType {
  Let = "Let",
  Return = "Return",
  Expression = "Expression",
  Block = "Block",
}

export enum AstExpressionType {
  Identifier = "Identifier",
  Integer = "Integer",
  Prefix = "Prefix",
  Infix = "Infix",
  Boolean = "Boolean",
  If = "If",
  Function = "Function",
  Call = "Call",
  String = "String",
  Array = "Array",
  Index = "Index",
}

export enum AstProgramType {
  Program = "Program",
}

export enum ExpressionPrecedence {
  LOWEST,
  EQUALS, // ==
  LESSGREATER, // > or <
  SUM, // +
  PRODUCT, // *
  PREFIX, // -X or !X,
  CALL, // foo(x)
  INDEX,
}

export const TokenOperatorPrecedences: Partial<Record<TokenType, ExpressionPrecedence>> = {
  [TokenType.EQ]: ExpressionPrecedence.EQUALS,
  [TokenType.NOT_EQ]: ExpressionPrecedence.EQUALS,
  [TokenType.LT]: ExpressionPrecedence.LESSGREATER,
  [TokenType.GT]: ExpressionPrecedence.LESSGREATER,
  [TokenType.PLUS]: ExpressionPrecedence.SUM,
  [TokenType.MINUS]: ExpressionPrecedence.SUM,
  [TokenType.SLASH]: ExpressionPrecedence.PRODUCT,
  [TokenType.ASTERISK]: ExpressionPrecedence.PRODUCT,
  [TokenType.LPAREN]: ExpressionPrecedence.CALL,
  [TokenType.LBRACKET]: ExpressionPrecedence.INDEX,
};

export interface Node {
  tokenLiteral(): string;
}

export interface Statement extends Node {
  readonly type: AstStatementType;
}

export interface Expression extends Node {
  readonly type: AstExpressionType;
}
