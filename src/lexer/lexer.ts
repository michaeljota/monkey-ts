import { TokenType, type Token } from "::token";
import { isLetter, getTokenTypeFromLiteral, isDigit, isWhitespace } from "::util";

const NUL = Symbol("NUL");

export class Lexer {
  /**
   * current position in input (points to current char)
   */
  private position: number = 0;

  private get ch(): Maybe<string> {
    return this.input.at(this.position);
  }

  private get nextCh(): Maybe<string> {
    return this.input.at(this.position + 1);
  }

  constructor(private readonly input: string) {}

  nextToken(): Token {
    this.skipWhitespace();

    let literal = this.ch;
    let type: TokenType;

    if (this.position >= this.input.length) {
      return {
        literal: "",
        type: TokenType.EOF,
      };
    }

    switch (literal) {
      case "=": {
        if (this.nextCh === "=") {
          this.nextPosition();
          literal = "==";
          type = TokenType.EQ;
        } else {
          type = TokenType.ASSIGN;
        }
        break;
      }
      case ";": {
        type = TokenType.SEMICOLON;
        break;
      }
      case ",": {
        type = TokenType.COMMA;
        break;
      }
      case "+": {
        type = TokenType.PLUS;
        break;
      }
      case "-": {
        type = TokenType.MINUS;
        break;
      }
      case "*": {
        type = TokenType.ASTERISK;
        break;
      }
      case "/": {
        type = TokenType.SLASH;
        break;
      }
      case "!": {
        if (this.nextCh === "=") {
          this.nextPosition();
          literal = "!=";
          type = TokenType.NOT_EQ;
        } else {
          type = TokenType.BANG;
        }
        break;
      }
      case "{": {
        type = TokenType.LBRACE;
        break;
      }
      case "}": {
        type = TokenType.RBRACE;
        break;
      }
      case "(": {
        type = TokenType.LPAREN;
        break;
      }
      case ")": {
        type = TokenType.RPAREN;
        break;
      }
      case "[": {
        type = TokenType.LBRACKET;
        break;
      }
      case "]": {
        type = TokenType.RBRACKET;
        break;
      }
      case "<": {
        type = TokenType.LT;
        break;
      }
      case ">": {
        type = TokenType.GT;
        break;
      }
      case '"': {
        type = TokenType.STRING;
        literal = this.readString();
        break;
      }
      default: {
        if (isLetter(literal)) {
          const literal = this.readIdentifier();
          const type = getTokenTypeFromLiteral(literal);
          return {
            literal,
            type,
          };
        }

        if (isDigit(literal)) {
          const literal = this.readNumber();
          return {
            literal,
            type: TokenType.INT,
          };
        }

        type = TokenType.ILLEGAL;
      }
    }

    this.nextPosition();

    return {
      literal: literal ?? "\0",
      type,
    };
  }

  private nextPosition(): void {
    this.position++;
  }

  private readIdentifier(): string {
    const currentPosition = this.position;

    while (isLetter(this.ch)) {
      this.nextPosition();
    }

    return this.input.substring(currentPosition, this.position);
  }

  private readNumber(): string {
    const currentPosition = this.position;

    while (isDigit(this.ch)) {
      this.nextPosition();
    }

    return this.input.substring(currentPosition, this.position);
  }

  private skipWhitespace(): void {
    while (isWhitespace(this.ch)) {
      this.nextPosition();
    }
  }

  private readString(): string {
    this.nextPosition();
    const currentPosition = this.position;

    while (this.ch !== '"') {
      this.nextPosition();
    }

    return this.input.substring(currentPosition, this.position);
  }
}
