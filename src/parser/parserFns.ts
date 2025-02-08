import {
  BooleanLiteral,
  Identifier,
  IntegerLiteral,
  StringLiteral,
  type ExpressionUnion,
} from "::ast";
import { TokenType } from "::token";
import type { Parser } from "./parser";
import { pushError } from "./stores";

export interface PrefixParserFn {
  (parser: Parser): Maybe<ExpressionUnion>;
}

export interface InfixParserFn {
  (leftSideExpression: ExpressionUnion): Maybe<ExpressionUnion>;
}

export type TokenTypeDictionary<T> = Partial<Record<TokenType, T>>;

const parseIdentifier: PrefixParserFn = (parser) => {
  return new Identifier(parser.currentToken, parser.currentToken.literal);
};

const parseIntegerLiteral: PrefixParserFn = (parser) => {
  const value = Number.parseInt(parser.currentToken.literal, 10);
  const coercionChecker = Number(parser.currentToken.literal);

  if (Number.isNaN(value) || Number.isNaN(coercionChecker)) {
    pushError(`Could not parse ${value} as integer`);
    return;
  }

  return new IntegerLiteral(parser.currentToken, value);
};

const parseStringLiteral: PrefixParserFn = (parser) => {
  return new StringLiteral(parser.currentToken, parser.currentToken.literal);
};

const parseBooleanExpression: PrefixParserFn = (parser) => {
  const value =
    parser.currentToken.type === TokenType.TRUE
      ? true
      : parser.currentToken.type === TokenType.FALSE
        ? false
        : undefined;

  if (value == null) {
    pushError(`Could not parse ${value} as boolean`);
    return;
  }

  return new BooleanLiteral(parser.currentToken, value);
};

export const PrefixParserFns: TokenTypeDictionary<PrefixParserFn> = {
  [TokenType.IDENT]: parseIdentifier,
  [TokenType.INT]: parseIntegerLiteral,
  [TokenType.STRING]: parseStringLiteral,
  // [TokenType.BANG]: parsePrefixExpression,
  // [TokenType.MINUS]: parsePrefixExpression,
  [TokenType.TRUE]: parseBooleanExpression,
  [TokenType.FALSE]: parseBooleanExpression,
  // [TokenType.LPAREN]: parseGroupedExpression,
  // [TokenType.IF]: parseIfExpression,
  // [TokenType.FUNCTION]: parseFunctionLiteral,
  // [TokenType.LBRACKET]: parseArrayLiteral,
  // [TokenType.LBRACE]: parseHashLiteral,
};
