import { TokenType } from "::token";
import { ExpressionPrecedence, TokenOperatorPrecedences } from "::ast";
import type { Peekable, PeekableLexer, PeekableToken, TokenTypeDictionary } from "./types";

const TokenTypeToLiteralMap: TokenTypeDictionary<string> = {
  // Operators
  [TokenType.ASSIGN]: "=",
  [TokenType.PLUS]: "+",
  [TokenType.MINUS]: "-",
  [TokenType.BANG]: "!",
  [TokenType.ASTERISK]: "*",
  [TokenType.SLASH]: "/",
  [TokenType.LT]: "<",
  [TokenType.GT]: ">",
  [TokenType.EQ]: "==",
  [TokenType.NOT_EQ]: "!=",
  // Delimiters
  [TokenType.COMMA]: ",",
  [TokenType.SEMICOLON]: ";",
  [TokenType.COLON]: ":",
  [TokenType.LPAREN]: "(",
  [TokenType.RPAREN]: ")",
  [TokenType.LBRACE]: "{",
  [TokenType.RBRACE]: "}",
  [TokenType.LBRACKET]: "[",
  [TokenType.RBRACKET]: "]",
};

const getTokenTypeLiteral = (expected: TokenType) =>
  TokenTypeToLiteralMap[expected] ?? TokenType[expected];

export function* peekable<T>(gen: Generator<T, T>): Peekable<T> {
  let peeked = gen.next();

  while (!peeked.done) {
    const current = peeked;
    peeked = gen.next();

    const peek = peeked.value;

    yield { current: current.value, peek };
  }

  return { current: peeked.value };
}

export function getPrecedence(tokenType: TokenType): ExpressionPrecedence {
  return TokenOperatorPrecedences[tokenType] ?? ExpressionPrecedence.LOWEST;
}

export const getNextExpectedTokenPair = (
  tokenPair: PeekableToken,
  expectedTokenType: TokenType,
  lexer: PeekableLexer,
): Result<PeekableToken, string> => {
  if (tokenPair.peek?.type !== expectedTokenType) {
    return [
      ,
      `Next token expected to be ${getTokenTypeLiteral(expectedTokenType)}, but found ${tokenPair.peek?.literal ?? "no token"} instead.`,
    ];
  }

  const result = lexer.next();
  return [result.value];
};
