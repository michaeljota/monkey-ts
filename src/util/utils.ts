import { TokenType } from "::token";

export const isLetter = (ch: Maybe<string>) => ch != null && /[a-zA-Z_]/.test(ch);

export const isDigit = (ch: Maybe<string>) => ch != null && /^\d+$/.test(ch);

export const isWhitespace = (ch: Maybe<string>) => ch != null && /\s+/.test(ch);

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
