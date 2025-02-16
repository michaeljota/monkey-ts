import type { ExpressionUnion } from "::ast";
import type { Lexer } from "::lexer/lexer";
import type { TokenType } from "::token";

export interface PrefixParserFn {
  (lexer: Lexer): Result<ExpressionUnion, string>;
}

export interface InfixParserFn {
  (lexer: Lexer, leftSideExpression: ExpressionUnion): Result<ExpressionUnion, string>;
}

export type TokenTypeDictionary<T> = Partial<Record<TokenType, T>>;

export type PeekableNext<T> = {
  current: T;
  peek?: T;
};

export type Peekable<T> = Generator<PeekableNext<T>, PeekableNext<T>>;
