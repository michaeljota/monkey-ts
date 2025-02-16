import { TokenType, type Token } from "::token";
import type { Lexer } from "::lexer/lexer";
import { ExpressionPrecedence, TokenOperatorPrecedences } from "::ast";
import type { TokenTypeDictionary } from "./types";

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

export function getPrecedence(tokenType: TokenType): ExpressionPrecedence {
  return TokenOperatorPrecedences[tokenType] ?? ExpressionPrecedence.LOWEST;
}

export const getNextExpectedToken = (
  lexer: Lexer,
  expectedTokenType: TokenType,
): Result<Token, string> => {
  const peeked = lexer.peek();
  if (peeked?.type !== expectedTokenType) {
    return [
      ,
      `Next token expected to be ${getTokenTypeLiteral(expectedTokenType)}, but found ${peeked?.literal ?? "no token"} instead.`,
    ];
  }

  lexer.next();
  const result = lexer.getToken();
  return [result];
};
