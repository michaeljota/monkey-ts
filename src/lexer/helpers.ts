import { TokenType } from "::token";

export const isLetter = (ch: Maybe<string>) => ch != null && /[a-zA-Z_]/.test(ch);

export const isDigit = (ch: Maybe<string>) => ch != null && /^\d$/.test(ch);

export const isWhitespace = (ch: Maybe<string>) => ch != null && /\s+/.test(ch);

const isNotQuotationMark = (ch: Maybe<string>) => ch !== '"';

const Keywords: Record<string, TokenType> = {
  fn: TokenType.FUNCTION,
  let: TokenType.LET,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  if: TokenType.IF,
  else: TokenType.ELSE,
  return: TokenType.RETURN,
};

export const isEndOfFile = (inputLength: number, cursor: number) => cursor >= inputLength;

export const getTokenTypeFromLiteral = (literal: string): TokenType =>
  Keywords[literal] ?? TokenType.IDENT;

const readStringToken =
  (isExpectedToken: (ch: Maybe<string>) => boolean) =>
  (input: string, cursor: number): [string, number] => {
    let nextCursor = cursor;

    while (cursor < input.length && isExpectedToken(input.at(nextCursor))) {
      nextCursor++;
    }

    return [input.substring(cursor, nextCursor), nextCursor];
  };

export const skipWhitespace = (input: string, cursor: number): number => {
  const [, nextCursor] = readStringToken(isWhitespace)(input, cursor);
  return nextCursor;
};

export const readString = readStringToken(isNotQuotationMark);

export const readIdentifier = readStringToken(isLetter);

export const readNumber = readStringToken(isDigit);
