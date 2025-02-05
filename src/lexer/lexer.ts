import { TokenType, type Token } from "::token";
import { isLetter, getTokenTypeFromLiteral, isDigit } from "::util";

const NUL = Symbol("NUL");

export class Lexer {
  /**
   * current position in input (points to current char)
   */
  position: number = 0;
  /**
   * current reading position in input (after current char)
   */
  readPosition: number = 0;
  /**
   * current char under examination
   */
  ch: string | typeof NUL = NUL;

  constructor(private readonly input: string) {
    this.readChar();
  }

  nextToken(): Token {
    this.skipWhitespace();

    let literal = this.ch;
    let type: TokenType;

    switch (literal) {
      case "=": {
        if (this.peekChar() === "=") {
          this.readChar();
          literal = `${literal}${String(this.ch)}`;
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
        if (this.peekChar() === "=") {
          this.readChar();
          literal = `${literal}${String(this.ch)}`;
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
      case NUL: {
        literal = "";
        type = TokenType.EOF;
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

    this.readChar();

    return {
      literal,
      type,
    };
  }

  private readChar(): void {
    this.ch = this.readPosition >= this.input.length ? NUL : this.input[this.readPosition];

    this.position = this.readPosition;
    this.readPosition++;
  }

  private readIdentifier(): string {
    const currentPosition = this.position;

    while (typeof this.ch === "string" && isLetter(this.ch)) {
      this.readChar();
    }

    return this.input.substring(currentPosition, this.position);
  }

  private readNumber(): string {
    const currentPosition = this.position;

    while (typeof this.ch === "string" && isDigit(this.ch)) {
      this.readChar();
    }

    return this.input.substring(currentPosition, this.position);
  }

  private skipWhitespace(): void {
    while (typeof this.ch === "string" && /\s+/.test(this.ch)) {
      this.readChar();
    }
  }

  private peekChar(): Maybe<string> {
    return this.input[this.readPosition];
  }

  private readString(): string {
    this.readChar();
    const currentPosition = this.position;

    while (this.ch !== '"') {
      this.readChar();
    }

    return this.input.substring(currentPosition, this.position);
  }
}
