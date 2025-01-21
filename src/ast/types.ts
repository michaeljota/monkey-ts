export enum AstStatementType {
  Let,
  Return,
}

export enum AstExpressionType {
  Identifier,
}

export interface Node {
  tokenLiteral(): string;
}

export interface Statement extends Node {
  type: AstStatementType;
}

export interface Expression extends Node {
  type: AstExpressionType;
}
