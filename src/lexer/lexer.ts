import { createStore, createEvent, sample, combine, createEffect } from "effector";
import { TokenType, type Token } from "::token";
import { isLetter, getTokenTypeFromLiteral, isDigit, isWhitespace } from "::util";

const initLexer = createEvent<string>();
const setCursor = createEvent<number>();
const setToken = createEvent<Token>();
const getNextToken = createEvent();

const $input = createStore("").on(initLexer, (_, newInput) => newInput);
const $cursor = createStore(0)
  .on(initLexer, () => 0)
  .on(setCursor, (_, pos) => pos);
const $token = createStore<Token>({
  literal: "",
  type: TokenType.EOF,
})
  .on(initLexer, () => ({
    literal: "",
    type: TokenType.EOF,
  }))
  .on(setToken, (_, token) => token);

type NextTokenFxInput = {
  input: string;
  cursor: number;
};

type NextTokenFxOutput = {
  token: Token;
  cursor: number;
};

const nextTokenFx = createEffect(({ cursor, input }: NextTokenFxInput): NextTokenFxOutput => {
  const positionAfterWhitespaces = skipWhitespace(input, cursor);
  const isFinished = positionAfterWhitespaces >= input.length;
  const ch = input.at(positionAfterWhitespaces);
  const nextCh = input.at(positionAfterWhitespaces + 1);

  if (isFinished) {
    return {
      token: {
        literal: "",
        type: TokenType.EOF,
      },
      cursor: positionAfterWhitespaces,
    };
  }

  switch (ch) {
    case "=": {
      if (nextCh === "=") {
        return {
          token: { type: TokenType.EQ, literal: "==" },
          cursor: positionAfterWhitespaces + 2,
        };
      }

      return {
        token: { type: TokenType.ASSIGN, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }

    case ";": {
      return {
        token: { type: TokenType.SEMICOLON, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case ":": {
      return {
        token: { type: TokenType.COLON, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case ",": {
      return {
        token: { type: TokenType.COMMA, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "+": {
      return {
        token: { type: TokenType.PLUS, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "-": {
      return {
        token: { type: TokenType.MINUS, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "*": {
      return {
        token: { type: TokenType.ASTERISK, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "/": {
      return {
        token: { type: TokenType.SLASH, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "!": {
      if (nextCh === "=") {
        return {
          token: { type: TokenType.NOT_EQ, literal: "!=" },
          cursor: positionAfterWhitespaces + 2,
        };
      }
      return {
        token: { type: TokenType.BANG, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "{": {
      return {
        token: { type: TokenType.LBRACE, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "}": {
      return {
        token: { type: TokenType.RBRACE, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "(": {
      return {
        token: { type: TokenType.LPAREN, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case ")": {
      return {
        token: { type: TokenType.RPAREN, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "[": {
      return {
        token: { type: TokenType.LBRACKET, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "]": {
      return {
        token: { type: TokenType.RBRACKET, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case "<": {
      return {
        token: { type: TokenType.LT, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case ">": {
      return {
        token: { type: TokenType.GT, literal: ch },
        cursor: positionAfterWhitespaces + 1,
      };
    }
    case '"': {
      const [strLiteral, position] = readString(input, positionAfterWhitespaces + 1);
      return {
        token: { type: TokenType.STRING, literal: strLiteral },
        cursor: position + 1,
      };
    }
    default:
      if (isLetter(ch)) {
        const [identLiteral, position] = readIdentifier(input, positionAfterWhitespaces);
        return {
          token: {
            type: getTokenTypeFromLiteral(identLiteral),
            literal: identLiteral,
          },
          cursor: position,
        };
      }
      if (isDigit(ch)) {
        const [numberLiteral, position] = readNumber(input, positionAfterWhitespaces);
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
  clock: nextTokenFx.doneData.map(({ cursor: position }) => position),
  target: setCursor,
});

sample({
  clock: nextTokenFx.doneData.map(({ token }) => token),
  target: setToken,
});

export const skipWhitespace = (input: string, position: number): number => {
  const ch = input[position];

  if (!isWhitespace(ch)) {
    return position;
  }

  return skipWhitespace(input, position + 1);
};

export const readString = (
  input: string,
  initialPosition: number,
  currentPosition: number = initialPosition,
): [string, number] => {
  const ch = input[currentPosition];

  if (ch === '"') {
    return [input.substring(initialPosition, currentPosition), currentPosition];
  }

  return readString(input, initialPosition, currentPosition + 1);
};

export const readIdentifier = (
  input: string,
  initialPosition: number,
  currentPosition: number = initialPosition,
): [string, number] => {
  const ch = input[currentPosition];

  if (!isLetter(ch)) {
    return [input.substring(initialPosition, currentPosition), currentPosition];
  }

  return readIdentifier(input, initialPosition, currentPosition + 1);
};

export const readNumber = (
  input: string,
  initialPosition: number,
  currentPosition: number = initialPosition,
): [string, number] => {
  const ch = input[currentPosition];

  if (!isDigit(ch)) {
    return [input.substring(initialPosition, currentPosition), currentPosition];
  }

  return readNumber(input, initialPosition, currentPosition + 1);
};

export class Lexer {
  constructor(input: string) {
    initLexer(input);
  }

  nextToken() {
    getNextToken();
    return $token.getState();
  }
}
