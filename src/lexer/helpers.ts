import { TokenType } from "::token";

export const isLetter = (ch: Maybe<string>) => ch != null && /[a-zA-Z_]/.test(ch);

export const isDigit = (ch: Maybe<string>) => ch != null && /^\d$/.test(ch);

export const isWhitespace = (ch: Maybe<string>) => ch != null && /\s+/.test(ch);

const Keywords: Record<string, TokenType> = {
  fn: TokenType.FUNCTION,
  let: TokenType.LET,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  if: TokenType.IF,
  else: TokenType.ELSE,
  return: TokenType.RETURN,
};

export const isEndOfFile = (inputLength: number, position: number) => position >= inputLength;

export const getTokenTypeFromLiteral = (literal: string): TokenType =>
  Keywords[literal] ?? TokenType.IDENT;

export const skipWhitespace = (input: string, position: number): number => {
  const ch = input.at(position);

  if (isEndOfFile(input.length, position) || !isWhitespace(ch)) {
    return position;
  }

  return skipWhitespace(input, position + 1);
};

export const readString = (
  input: string,
  initialPosition: number,
  currentPosition: number = initialPosition,
): [string, number] => {
  const ch = input.at(currentPosition);

  if (currentPosition >= input.length || ch === '"') {
    return [input.substring(initialPosition, currentPosition), currentPosition];
  }

  return readString(input, initialPosition, currentPosition + 1);
};

export const readIdentifier = (
  input: string,
  initialPosition: number,
  currentPosition: number = initialPosition,
): [string, number] => {
  const ch = input.at(currentPosition);

  if (currentPosition >= input.length || !isLetter(ch)) {
    return [input.substring(initialPosition, currentPosition), currentPosition];
  }

  return readIdentifier(input, initialPosition, currentPosition + 1);
};

export const readNumber = (
  input: string,
  initialPosition: number,
  currentPosition: number = initialPosition,
): [string, number] => {
  const ch = input.at(currentPosition);

  if (currentPosition >= input.length || !isDigit(ch)) {
    return [input.substring(initialPosition, currentPosition), currentPosition];
  }

  return readNumber(input, initialPosition, currentPosition + 1);
};
