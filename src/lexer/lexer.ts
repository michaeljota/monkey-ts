import { TokenType, type Token } from "::token";
import {
  skipWhitespace,
  readString,
  isLetter,
  readIdentifier,
  getTokenTypeFromLiteral,
  isDigit,
  readNumber,
  isWhitespace,
} from "./helpers";

export type Lexer = Generator<Token, Token, void>;

export function* getLexer(input: string): Lexer {
  let cursor: number = 0;

  while (cursor < input.length) {
    cursor = skipWhitespace(input, cursor);

    if (cursor >= input.length) {
      break;
    }

    const ch = input.at(cursor);
    const nextCh = input.at(cursor + 1);

    switch (ch) {
      case "=": {
        cursor++;
        if (nextCh === "=") {
          cursor++;
          yield { type: TokenType.EQ, literal: "==" };
          break;
        }
        yield { type: TokenType.ASSIGN, literal: ch };
        break;
      }

      case ";": {
        cursor++;
        yield { type: TokenType.SEMICOLON, literal: ch };
        break;
      }
      case ":": {
        cursor++;
        yield { type: TokenType.COLON, literal: ch };
        break;
      }
      case ",": {
        cursor++;
        yield { type: TokenType.COMMA, literal: ch };
        break;
      }
      case "+": {
        cursor++;
        yield { type: TokenType.PLUS, literal: ch };
        break;
      }
      case "-": {
        cursor++;
        yield { type: TokenType.MINUS, literal: ch };
        break;
      }
      case "*": {
        cursor++;
        yield { type: TokenType.ASTERISK, literal: ch };
        break;
      }
      case "/": {
        cursor++;
        yield { type: TokenType.SLASH, literal: ch };
        break;
      }
      case "!": {
        cursor++;
        if (nextCh === "=") {
          cursor++;
          yield { type: TokenType.NOT_EQ, literal: "!=" };
          break;
        }
        yield { type: TokenType.BANG, literal: ch };
        break;
      }
      case "{": {
        cursor++;
        yield { type: TokenType.LBRACE, literal: ch };
        break;
      }
      case "}": {
        cursor++;
        yield { type: TokenType.RBRACE, literal: ch };
        break;
      }
      case "(": {
        cursor++;
        yield { type: TokenType.LPAREN, literal: ch };
        break;
      }
      case ")": {
        cursor++;
        yield { type: TokenType.RPAREN, literal: ch };
        break;
      }
      case "[": {
        cursor++;
        yield { type: TokenType.LBRACKET, literal: ch };
        break;
      }
      case "]": {
        cursor++;
        yield { type: TokenType.RBRACKET, literal: ch };
        break;
      }
      case "<": {
        cursor++;
        yield { type: TokenType.LT, literal: ch };
        break;
      }
      case ">": {
        cursor++;
        yield { type: TokenType.GT, literal: ch };
        break;
      }
      case '"': {
        const [strLiteral, newCursor] = readString(input, cursor + 1);
        cursor = newCursor + 1;
        yield { type: TokenType.STRING, literal: strLiteral };
        break;
      }
      default:
        if (isLetter(ch)) {
          const [identLiteral, newCursor] = readIdentifier(input, cursor);
          cursor = newCursor;
          yield {
            type: getTokenTypeFromLiteral(identLiteral),
            literal: identLiteral,
          };
          break;
        }
        if (isDigit(ch)) {
          const [numberLiteral, newCursor] = readNumber(input, cursor);
          cursor = newCursor;
          yield { type: TokenType.INT, literal: numberLiteral };
          break;
        }
        cursor++;
        yield { type: TokenType.ILLEGAL, literal: ch ?? "\0" };
    }
  }

  return {
    type: TokenType.EOF,
    literal: "\0",
  };
}
