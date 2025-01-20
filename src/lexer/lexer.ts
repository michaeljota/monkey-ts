import { Tokens, type Token, type TokenType } from "::token";
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
    this.readChart();
  }

  nextToken(): Token {
    this.skipWhitespace();
    const token = this.getToken();

    if (
      ![Tokens.FUNCTION, Tokens.LET, Tokens.IDENT, Tokens.INT].includes(
        token.type,
      )
    ) {
      this.readChart();
    }

    return token;
  }

  private getToken(): Token {
    const literal = this.ch;

    switch (literal) {
      case "=":
        return {
          literal,
          type: Tokens.ASSIGN,
        };
      case ";":
        return {
          literal,
          type: Tokens.SEMICOLON,
        };
      case "(":
        return {
          literal,
          type: Tokens.LPAREN,
        };
      case ")":
        return {
          literal,
          type: Tokens.RPAREN,
        };
      case ",":
        return {
          literal,
          type: Tokens.COMMA,
        };
      case "+":
        return {
          literal,
          type: Tokens.PLUS,
        };
      case "{":
        return {
          literal,
          type: Tokens.LBRACE,
        };
      case "}":
        return {
          literal,
          type: Tokens.RBRACE,
        };
      case NUL: {
        return {
          literal: "",
          type: Tokens.EOF,
        };
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
            type: Tokens.INT,
          };
        }

        return {
          literal,
          type: Tokens.ILLEGAL,
        };
      }
    }
  }

  private readChart(): void {
    this.ch =
      this.readPosition >= this.input.length
        ? NUL
        : this.input[this.readPosition];

    this.position = this.readPosition;
    this.readPosition++;
  }

  private readIdentifier(): string {
    const currentPosition = this.position;

    while (typeof this.ch === "string" && isLetter(this.ch)) {
      this.readChart();
    }

    return this.input.substring(currentPosition, this.position);
  }

  private readNumber(): string {
    const currentPosition = this.position;

    while (typeof this.ch === "string" && isDigit(this.ch)) {
      this.readChart();
    }

    return this.input.substring(currentPosition, this.position);
  }

  private skipWhitespace(): void {
    while (typeof this.ch === "string" && /\s+/.test(this.ch)) {
      this.readChart();
    }
  }
}
