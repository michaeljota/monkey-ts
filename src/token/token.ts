export interface Token {
  type: TokenType;
  literal: string;
}

export enum TokenType {
  ILLEGAL = "ILLEGAL",
  EOF = "EOF",
  // Identifiers + literals
  IDENT = "IDENT", // add, foobar, x, y, ...
  INT = "INT", // 1343456
  STRING = "STRING",
  // Operators
  ASSIGN = "=",
  PLUS = "+",
  MINUS = "-",
  BANG = "!",
  ASTERISK = "*",
  SLASH = "/",
  LT = "<",
  GT = ">",
  EQ = "==",
  NOT_EQ = "!=",
  // Delimiters
  COMMA = ",",
  SEMICOLON = ";",
  COLON = ":",
  LPAREN = "(",
  RPAREN = ")",
  LBRACE = "{",
  RBRACE = "}",
  LBRACKET = "[",
  RBRACKET = "]",
  FUNCTION = "FUNCTION",
  LET = "LET",
  TRUE = "TRUE",
  FALSE = "FALSE",
  IF = "IF",
  ELSE = "ELSE",
  RETURN = "RETURN",
}
