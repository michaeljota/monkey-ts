import type { ExpressionUnion } from "::ast";
import type { TokenType } from "::token";

export interface PrefixParserFn {
  (): Maybe<ExpressionUnion>;
}

export interface InfixParserFn {
  (leftSideExpression: ExpressionUnion): Maybe<ExpressionUnion>;
}

export type TokenTypeDictionary<T> = Partial<Record<TokenType, T>>;
