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
  ASSIGN = "ASSIGN",
  PLUS = "PLUS",
  MINUS = "MINUS",
  BANG = "BANG",
  ASTERISK = "ASTERISK",
  SLASH = "SLASH",
  LT = "LT",
  GT = "GT",
  EQ = "EQ",
  NOT_EQ = "NOT_EQ",
  // Delimiters
  COMMA = "COMMA",
  SEMICOLON = "SEMICOLON",
  COLON = "COLON",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  LBRACE = "LBRACE",
  RBRACE = "RBRACE",
  LBRACKET = "LBRACKET",
  RBRACKET = "RBRACKET",
  FUNCTION = "FUNCTION",
  LET = "LET",
  TRUE = "TRUE",
  FALSE = "FALSE",
  IF = "IF",
  ELSE = "ELSE",
  RETURN = "RETURN",
}
