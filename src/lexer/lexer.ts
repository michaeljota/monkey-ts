import { computed, event, state, type ComputedState } from "signux";
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
  $currentToken: ComputedState<Token>;
  $previewToken: ComputedState<Maybe<Token>>;
  $lookbehindToken: ComputedState<Maybe<Token>>;
  advanceToken(): void;
  rewindToken(): void;
  restart(): void;
};

export function createLexer(input: string): Lexer {
  const advanceToken = event();
  const rewindToken = event();
  const restart = event();
  const $cursorHistory = state<number[]>([])
    .on(advanceToken, (history) => {
      const cursor = history.at(-1) ?? 0;
      const [, newCursor] = readToken(input, cursor);
      return [...history, newCursor];
    })
    .on(rewindToken, ([...history]) => {
      history.pop();
      return history;
    })
    .on(restart, () => [])
    .create();

  const $cursor = computed(() => $cursorHistory().at(-1) ?? 0);

  const $currentToken = computed(() => {
    const [token] = readToken(input, $cursor());
    return token;
  });

  const $previewToken = computed(() => {
    const [, nextCursor] = readToken(input, $cursor());
    if (nextCursor >= input.length) {
      return;
    }
    const [token] = readToken(input, nextCursor);
    return token;
  });

  const $lookbehindToken = computed(() => {
    const cursor = $cursorHistory().at(-1);
    if (!cursor) {
      return;
    }
    const [token] = readToken(input, cursor);
    return token;
  });

  return {
    $currentToken,
    $lookbehindToken,
    $previewToken,
    advanceToken,
    rewindToken,
    restart,
  };
}

type TokenWithNext = [token: Token, nextPosition: number];

function readToken(input: string, startCursor: number): TokenWithNext {
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
