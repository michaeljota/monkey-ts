import { TokenType } from "::token";

export const isLetter = (char: string) => /[a-zA-Z_]/.test(char);

export const isDigit = (char: string) => /^\d+$/.test(char);

export const Keywords: Record<string, TokenType> = {
  fn: TokenType.FUNCTION,
  let: TokenType.LET,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  if: TokenType.IF,
  else: TokenType.ELSE,
  return: TokenType.RETURN,
};

export const getTokenTypeFromLiteral = (literal: string): TokenType =>
  Keywords[literal] ?? TokenType.IDENT;
