import { Tokens, type TokenType } from "::token";

export const isLetter = (char: string) => /[a-zA-Z_]/.test(char);

export const isDigit = (char: string) => /^\d+$/.test(char);

export const Keywords: Record<string, TokenType> = {
  fn: Tokens.FUNCTION,
  let: Tokens.LET,
};

export const getTokenTypeFromLiteral = (literal: string): TokenType =>
  Keywords[literal] ?? Tokens.IDENT;
