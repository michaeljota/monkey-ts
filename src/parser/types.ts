import type { ExpressionUnion } from "::ast";
import type { Token, TokenType } from "::token";

export interface PrefixParserFn {
  (tokenPair: PeekableToken, lexer: PeekableLexer): Result<State<ExpressionUnion>, string>;
}

export interface InfixParserFn {
  (
    tokenPair: PeekableToken,
    leftSideExpression: ExpressionUnion,
    lexer: PeekableLexer,
  ): Result<State<ExpressionUnion>, string>;
}

export type PeekableToken = PeekableNext<Token>;
export type PeekableLexer = Peekable<Token>;

export type State<T> = {
  data: T;
  tokenPair: PeekableToken;
};

export type TokenTypeDictionary<T> = Partial<Record<TokenType, T>>;

export type PeekableNext<T> = {
  current: T;
  peek?: T;
};

export type Peekable<T> = Generator<PeekableNext<T>, PeekableNext<T>>;
