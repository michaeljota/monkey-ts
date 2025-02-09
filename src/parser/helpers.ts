import { TokenType } from "::token";

const TokenTypeToLiteralMap: Partial<Record<TokenType, string>> = {
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

export const getTokenTypeLiteral = (expected: TokenType) =>
  TokenTypeToLiteralMap[expected] ?? TokenType[expected];
