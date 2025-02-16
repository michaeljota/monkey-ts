import { computed, event, state } from "signux";
import { TokenType, type Token } from "::token";
import {
  whitespaceSkipper,
  readString,
  isLetter,
  readIdentifier,
  getTokenTypeFromLiteral,
  isDigit,
  readNumber,
} from "./helpers";

export type Lexer = {
  getToken(): Token;
  next(): void;
  peek(): Maybe<Token>;
};

export function createLexer(input: string): Lexer {
  const advanceCursorTo = event<number>();
  const $cursor = state(0)
    .on(advanceCursorTo, (_, cursor) => cursor)
    .create();

  const $token = computed(() => {
    const [token] = readNextToken(input, $cursor());
    return token;
  });

  return {
    next: () => {
      const [, newCursor] = readNextToken(input, $cursor());
      advanceCursorTo(newCursor);
    },
    getToken: () => $token(),
    peek: () => {
      const [, newCursor] = readNextToken(input, $cursor());
      const [token] = readNextToken(input, newCursor);
      return token;
    },
  };
}

type TokenWithNext = [token: Token, nextPosition: number];

function readNextToken(input: string, startCursor: number): TokenWithNext {
  const cursor = whitespaceSkipper(startCursor, input);

  if (cursor >= input.length) {
    return [{ type: TokenType.EOF, literal: "\0" }, cursor];
  }

  const ch = input[cursor];
  const nextCh = input[cursor + 1];

  switch (ch) {
    case "=":
      if (nextCh === "=") return [{ type: TokenType.EQ, literal: "==" }, cursor + 2];
      return [{ type: TokenType.ASSIGN, literal: "=" }, cursor + 1];

    case ";":
      return [{ type: TokenType.SEMICOLON, literal: ";" }, cursor + 1];

    case ":":
      return [{ type: TokenType.COLON, literal: ":" }, cursor + 1];

    case ",":
      return [{ type: TokenType.COMMA, literal: "," }, cursor + 1];

    case "+":
      return [{ type: TokenType.PLUS, literal: "+" }, cursor + 1];

    case "-":
      return [{ type: TokenType.MINUS, literal: "-" }, cursor + 1];

    case "*":
      return [{ type: TokenType.ASTERISK, literal: "*" }, cursor + 1];

    case "/":
      return [{ type: TokenType.SLASH, literal: "/" }, cursor + 1];

    case "!":
      if (nextCh === "=") return [{ type: TokenType.NOT_EQ, literal: "!=" }, cursor + 2];
      return [{ type: TokenType.BANG, literal: "!" }, cursor + 1];

    case "{":
      return [{ type: TokenType.LBRACE, literal: "{" }, cursor + 1];

    case "}":
      return [{ type: TokenType.RBRACE, literal: "}" }, cursor + 1];

    case "(":
      return [{ type: TokenType.LPAREN, literal: "(" }, cursor + 1];

    case ")":
      return [{ type: TokenType.RPAREN, literal: ")" }, cursor + 1];

    case "[":
      return [{ type: TokenType.LBRACKET, literal: "[" }, cursor + 1];

    case "]":
      return [{ type: TokenType.RBRACKET, literal: "]" }, cursor + 1];

    case "<":
      return [{ type: TokenType.LT, literal: "<" }, cursor + 1];

    case ">":
      return [{ type: TokenType.GT, literal: ">" }, cursor + 1];

    case '"': {
      const [literal, endCursor] = readString(input, cursor + 1);
      return [{ type: TokenType.STRING, literal }, endCursor + 1];
    }

    default: {
      if (isLetter(ch)) {
        const [literal, newCursor] = readIdentifier(input, cursor);
        return [{ type: getTokenTypeFromLiteral(literal), literal }, newCursor];
      }

      if (isDigit(ch)) {
        const [literal, newCursor] = readNumber(input, cursor);
        return [{ type: TokenType.INT, literal }, newCursor];
      }

      return [{ type: TokenType.ILLEGAL, literal: "\0" }, cursor + 1];
    }
  }
}
