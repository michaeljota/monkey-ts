import { createStore, createEvent, sample, createEffect } from "effector";
import { TokenType, type Token } from "::token";
import {
  skipWhitespace,
  readString,
  readIdentifier,
  readNumber,
  getTokenTypeFromLiteral,
  isDigit,
  isLetter,
  isEndOfFile,
} from "./helpers";

const EOF_TOKEN: Token = {
  literal: "",
  type: TokenType.EOF,
};

const initLexer = createEvent<string>();
const setNextTokenResult = createEvent<NextTokenFxResult>();

const $input = createStore("").on(initLexer, (_, newInput) => newInput);

const $cursor = createStore(0)
  .on(initLexer, () => 0)
  .on(setNextTokenResult, (_, { cursor }) => cursor);

export const getNextToken = createEvent();
export const $token = createStore(EOF_TOKEN)
  .on(initLexer, () => EOF_TOKEN)
  .on(setNextTokenResult, (_, { token }) => token);

type NextTokenFxParams = {
  input: string;
  cursor: number;
};

type NextTokenFxResult = {
  token: Token;
  cursor: number;
};

const nextTokenFx = createEffect(({ cursor, input }: NextTokenFxParams): NextTokenFxResult => {
  const cursorPositionAfterWhitespaces = skipWhitespace(input, cursor);
  const ch = input.at(cursorPositionAfterWhitespaces);
  const nextCh = input.at(cursorPositionAfterWhitespaces + 1);

  if (isEndOfFile(input.length, cursorPositionAfterWhitespaces)) {
    return {
      token: EOF_TOKEN,
      cursor: cursorPositionAfterWhitespaces,
    };
  }

  switch (ch) {
    case "=": {
      if (nextCh === "=") {
        return {
          token: { type: TokenType.EQ, literal: "==" },
          cursor: cursorPositionAfterWhitespaces + 2,
        };
      }

      return {
        token: { type: TokenType.ASSIGN, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }

    case ";": {
      return {
        token: { type: TokenType.SEMICOLON, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case ":": {
      return {
        token: { type: TokenType.COLON, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case ",": {
      return {
        token: { type: TokenType.COMMA, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "+": {
      return {
        token: { type: TokenType.PLUS, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "-": {
      return {
        token: { type: TokenType.MINUS, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "*": {
      return {
        token: { type: TokenType.ASTERISK, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "/": {
      return {
        token: { type: TokenType.SLASH, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "!": {
      if (nextCh === "=") {
        return {
          token: { type: TokenType.NOT_EQ, literal: "!=" },
          cursor: cursorPositionAfterWhitespaces + 2,
        };
      }
      return {
        token: { type: TokenType.BANG, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "{": {
      return {
        token: { type: TokenType.LBRACE, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "}": {
      return {
        token: { type: TokenType.RBRACE, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "(": {
      return {
        token: { type: TokenType.LPAREN, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case ")": {
      return {
        token: { type: TokenType.RPAREN, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "[": {
      return {
        token: { type: TokenType.LBRACKET, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "]": {
      return {
        token: { type: TokenType.RBRACKET, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case "<": {
      return {
        token: { type: TokenType.LT, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case ">": {
      return {
        token: { type: TokenType.GT, literal: ch },
        cursor: cursorPositionAfterWhitespaces + 1,
      };
    }
    case '"': {
      const [strLiteral, position] = readString(input, cursorPositionAfterWhitespaces + 1);
      return {
        token: { type: TokenType.STRING, literal: strLiteral },
        cursor: position + 1,
      };
    }
    default:
      if (isLetter(ch)) {
        const [identLiteral, position] = readIdentifier(input, cursorPositionAfterWhitespaces);
        return {
          token: {
            type: getTokenTypeFromLiteral(identLiteral),
            literal: identLiteral,
          },
          cursor: position,
        };
      }
      if (isDigit(ch)) {
        const [numberLiteral, position] = readNumber(input, cursorPositionAfterWhitespaces);
        return {
          token: { type: TokenType.INT, literal: numberLiteral },
          cursor: position,
        };
      }
      return {
        token: { type: TokenType.ILLEGAL, literal: ch ?? "" },
        cursor: cursor + 1,
      };
  }
});

sample({
  clock: getNextToken,
  source: { cursor: $cursor, input: $input },
  target: nextTokenFx,
});

sample({
  clock: nextTokenFx.doneData,
  target: setNextTokenResult,
});

export class Lexer {
  constructor(input: string) {
    initLexer(input);
  }

  nextToken() {
    getNextToken();
    return $token.getState();
  }
}
