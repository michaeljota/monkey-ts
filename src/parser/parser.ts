import { computed, event, state } from "signux";
import type { Lexer } from "::lexer/lexer";
import { TokenType } from "::token";
import {
  ArrayLiteral,
  BlockStatement,
  BooleanLiteral,
  CallExpression,
  ExpressionPrecedence,
  ExpressionStatement,
  FunctionLiteral,
  HashLiteral,
  Identifier,
  IfExpression,
  IndexExpression,
  InfixExpression,
  IntegerLiteral,
  LetStatement,
  PrefixExpression,
  Program,
  ReturnStatement,
  StringLiteral,
  type ExpressionUnion,
  type StatementUnion,
} from "::ast";

import type { TokenTypeDictionary, PrefixParserFn, InfixParserFn } from "./types";
import { getNextExpectedToken, getPrecedence } from "./helpers";

export function parseProgram(lexer: Lexer): Result<Program, string[]> {
  const addStatement = event<StatementUnion>();
  const $statements = state<StatementUnion[]>([])
    .on(addStatement, (statements, statement) => [...statements, statement])
    .create();
  const addError = event<string>();
  const $errors = state<string[]>([])
    .on(addError, (errors, error) => [...errors, error])
    .create();

  const $hasErrors = computed(() => $errors().length > 0);

  while (lexer.getToken().type !== TokenType.EOF) {
    const [statement, err] = parseStatement(lexer);
    lexer.next();

    if (err != null) {
      addError(err);
      continue;
    }

    addStatement(statement);
  }

  if ($hasErrors()) {
    return [, $errors()];
  }
  return [new Program($statements())];
}

function parseStatement(lexer: Lexer): Result<StatementUnion, string> {
  const token = lexer.getToken();
  switch (token.type) {
    case TokenType.LET:
      return parseLetStatement(lexer);
    case TokenType.RETURN:
      return parseReturnStatement(lexer);
    default:
      return parseExpressionStatement(lexer);
  }
}

function parseLetStatement(lexer: Lexer): Result<LetStatement, string> {
  const token = lexer.getToken();

  const [nameToken, nameError] = getNextExpectedToken(lexer, TokenType.IDENT);
  if (nameError != null) {
    return [, nameError];
  }

  const name = new Identifier(nameToken, nameToken.literal);

  const [, assignError] = getNextExpectedToken(lexer, TokenType.ASSIGN);
  if (assignError != null) {
    return [, assignError];
  }

  lexer.next();

  const [expressionValue, expressionError] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (expressionError != null) {
    return [, expressionError];
  }

  if (lexer.peek()?.type === TokenType.SEMICOLON) {
    lexer.next();
  }

  return [new LetStatement(token, name, expressionValue)];
}

function parseReturnStatement(lexer: Lexer): Result<ReturnStatement, string> {
  const token = lexer.getToken();
  lexer.next();

  const [expressionValue, error] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (error != null) {
    return [, error];
  }

  if (lexer.peek()?.type === TokenType.SEMICOLON) {
    lexer.next();
  }

  return [new ReturnStatement(token, expressionValue)];
}

function parseExpressionStatement(lexer: Lexer): Result<ExpressionStatement, string> {
  const token = lexer.getToken();

  const [expressionValue, error] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (error != null) {
    return [, error];
  }

  if (lexer.peek()?.type === TokenType.SEMICOLON) {
    lexer.next();
  }

  return [new ExpressionStatement(token, expressionValue)];
}

function parseBlockStatement(lexer: Lexer): Result<BlockStatement, string> {
  const [token, nextError] = getNextExpectedToken(lexer, TokenType.LBRACE);

  if (nextError != null) {
    return [, nextError];
  }

  lexer.next();

  const [statements, error] = parseStatements(lexer);
  if (error != null) {
    return [, error];
  }

  return [new BlockStatement(token, statements)];
}

function parseStatements(
  lexer: Lexer,
  statements: StatementUnion[] = [],
): Result<StatementUnion[], string> {
  if (lexer.getToken().type === TokenType.RBRACE) {
    return [statements];
  }

  const [statement, error] = parseStatement(lexer);
  if (error != null) {
    return [, error];
  }

  lexer.next();
  return parseStatements(lexer, [...statements, statement]);
}

function parseExpression(
  lexer: Lexer,
  precedence: ExpressionPrecedence,
): Result<ExpressionUnion, string> {
  const token = lexer.getToken();
  const prefixParser = PrefixParserFns[token.type];

  if (!prefixParser) {
    return [, `No prefix parser found for ${token.type}.`];
  }

  const [result, error] = prefixParser(lexer);
  if (error != null) {
    return [, error];
  }

  return parseExpressionWithInfix(result, precedence, lexer);
}

function parseExpressionWithInfix(
  expression: ExpressionUnion,
  precedence: ExpressionPrecedence,
  lexer: Lexer,
): Result<ExpressionUnion, string> {
  const peekToken = lexer.peek();
  if (
    !peekToken ||
    peekToken.type === TokenType.SEMICOLON ||
    precedence >= getPrecedence(peekToken.type)
  ) {
    return [expression];
  }

  const infixParser = InfixParserFns[peekToken.type];

  if (!infixParser) {
    return [expression];
  }

  lexer.next();

  const [newState, error] = infixParser(lexer, expression);
  if (error != null) {
    return [, error];
  }

  return parseExpressionWithInfix(newState, precedence, lexer);
}

const parseIdentifier: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();
  return [new Identifier(token, token.literal)];
};

const parseIntegerLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();
  const value = Number.parseInt(token.literal, 10);
  const coercionChecker = Number(token.literal);

  if (Number.isNaN(value) || Number.isNaN(coercionChecker)) {
    return [, `Could not parse ${value} as integer`];
  }

  return [new IntegerLiteral(token, value)];
};

const parseStringLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();
  return [new StringLiteral(token, token.literal)];
};

const BooleanTypeToNativeMap: Partial<Record<TokenType, boolean>> = {
  [TokenType.TRUE]: true,
  [TokenType.FALSE]: false,
};

const parseBooleanExpression: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();
  const value = BooleanTypeToNativeMap[token.type];

  if (value == null) {
    return [, `Could not parse ${value} as boolean`];
  }

  return [new BooleanLiteral(token, value)];
};

const parseGroupedExpression: PrefixParserFn = (lexer) => {
  lexer.next();
  const [expression, error] = parseExpression(lexer, ExpressionPrecedence.LOWEST);
  if (error != null) {
    return [, error];
  }

  const [, closingParenError] = getNextExpectedToken(lexer, TokenType.RPAREN);
  if (closingParenError != null) {
    return [, closingParenError];
  }

  return [expression];
};

const parsePrefixExpression: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();
  const operator = token.literal;

  lexer.next();

  const [expression, error] = parseExpression(lexer, ExpressionPrecedence.PREFIX);

  if (error != null) {
    return [, error];
  }

  return [new PrefixExpression(token, operator, expression)];
};

const parseIfExpression: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();
  const [, expectedLParenError] = getNextExpectedToken(lexer, TokenType.LPAREN);
  if (expectedLParenError != null) {
    return [, expectedLParenError];
  }

  lexer.next();
  const [condition, error] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (error != null) {
    return [, error];
  }

  const [, consequenceTokenError] = getNextExpectedToken(lexer, TokenType.RPAREN);

  if (consequenceTokenError != null) {
    return [, consequenceTokenError];
  }

  const [consequence, consequenceError] = parseBlockStatement(lexer);

  if (consequenceError != null) {
    return [, consequenceError];
  }

  const [alternative, elseError] = parseElseExpression(lexer);
  if (elseError != null) {
    return [, elseError];
  }

  return [new IfExpression(token, condition, consequence, alternative)];
};

const parseElseExpression = (lexer: Lexer): Result<Maybe<BlockStatement>, string> => {
  if (lexer.peek()?.type !== TokenType.ELSE) {
    return [undefined];
  }
  lexer.next();

  return parseBlockStatement(lexer);
};

const parseFunctionLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();

  const [parameters, error] = parseFunctionParameters(lexer);
  if (error != null) {
    return [, error];
  }

  const [body, blockError] = parseBlockStatement(lexer);
  if (blockError != null) {
    return [, blockError];
  }

  return [new FunctionLiteral(token, parameters, body)];
};

function parseFunctionParameters(lexer: Lexer): Result<Identifier[], string> {
  const [, nameError] = getNextExpectedToken(lexer, TokenType.LPAREN);
  if (nameError != null) {
    return [, nameError];
  }

  lexer.next();

  if (lexer.getToken().type === TokenType.RPAREN) {
    return [[]];
  }

  const [parameters] = parseFunctionParametersList(lexer);

  const [, error] = getNextExpectedToken(lexer, TokenType.RPAREN);

  if (error != null) {
    return [, error];
  }

  return [parameters];
}

const parseFunctionParametersList = (
  lexer: Lexer,
  parameters: Identifier[] = [],
): Ok<Identifier[]> => {
  const token = lexer.getToken();
  const identifier = new Identifier(token, token.literal);

  if (lexer.peek()?.type !== TokenType.COMMA) {
    return [[...parameters, identifier]];
  }

  lexer.next();
  lexer.next();
  return parseFunctionParametersList(lexer, [...parameters, identifier]);
};

const parseArgumentsList = (
  lexer: Lexer,
  argumentsList: ExpressionUnion[] = [],
): Result<ExpressionUnion[], string> => {
  const [argument, error] = parseExpression(lexer, ExpressionPrecedence.LOWEST);
  if (error != null) {
    return [, error];
  }

  if (lexer.peek()?.type !== TokenType.COMMA) {
    return [[...argumentsList, argument]];
  }

  lexer.next();
  lexer.next();
  return parseArgumentsList(lexer, [...argumentsList, argument]);
};

function parseExpressionList(
  lexer: Lexer,
  closerToken: TokenType,
): Result<ExpressionUnion[], string> {
  lexer.next();

  if (lexer.getToken().type === closerToken) {
    return [[]];
  }

  const [argumentsList, error] = parseArgumentsList(lexer);
  if (error != null) {
    return [, error];
  }

  const [, nextError] = getNextExpectedToken(lexer, closerToken);
  if (nextError != null) {
    return [, nextError];
  }

  return [argumentsList];
}

const parseArrayLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();
  const [argumentsList, error] = parseExpressionList(lexer, TokenType.RBRACKET);
  if (error != null) {
    return [, error];
  }

  return [new ArrayLiteral(token, argumentsList)];
};

type NativeHashMap = Map<ExpressionUnion, ExpressionUnion>;

const parseHashMap = (
  lexer: Lexer,
  pairs: NativeHashMap = new Map(),
): Result<NativeHashMap, string> => {
  if (lexer.peek()?.type === TokenType.RBRACE) {
    return [pairs];
  }

  lexer.next();
  const [keyExpression, keyError] = parseExpression(lexer, ExpressionPrecedence.LOWEST);
  if (keyError != null) {
    return [, keyError];
  }

  const [, error] = getNextExpectedToken(lexer, TokenType.COLON);
  if (error != null) {
    return [, error];
  }

  lexer.next();

  const [valueExpression, valueError] = parseExpression(lexer, ExpressionPrecedence.LOWEST);
  if (valueError != null) {
    return [, valueError];
  }

  pairs.set(keyExpression, valueExpression);

  if (lexer.peek()?.type !== TokenType.RBRACE) {
    const [, error] = getNextExpectedToken(lexer, TokenType.COMMA);
    if (error != null) {
      return [, error];
    }

    return parseHashMap(lexer, pairs);
  }

  return parseHashMap(lexer, pairs);
};

const parseHashLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.getToken();

  const [hash, hashError] = parseHashMap(lexer);
  if (hashError != null) {
    return [, hashError];
  }

  const [, rbraceError] = getNextExpectedToken(lexer, TokenType.RBRACE);
  if (rbraceError != null) {
    return [, rbraceError];
  }

  return [new HashLiteral(token, hash)];
};

const PrefixParserFns: TokenTypeDictionary<PrefixParserFn> = {
  [TokenType.IDENT]: parseIdentifier,
  [TokenType.INT]: parseIntegerLiteral,
  [TokenType.STRING]: parseStringLiteral,
  [TokenType.BANG]: parsePrefixExpression,
  [TokenType.MINUS]: parsePrefixExpression,
  [TokenType.TRUE]: parseBooleanExpression,
  [TokenType.FALSE]: parseBooleanExpression,
  [TokenType.LPAREN]: parseGroupedExpression,
  [TokenType.IF]: parseIfExpression,
  [TokenType.FUNCTION]: parseFunctionLiteral,
  [TokenType.LBRACKET]: parseArrayLiteral,
  [TokenType.LBRACE]: parseHashLiteral,
};

const parseInfixExpression: InfixParserFn = (lexer, left) => {
  const token = lexer.getToken();
  const operator = token.literal;
  const precedence = getPrecedence(token.type);

  lexer.next();

  const [expression, error] = parseExpression(lexer, precedence);

  if (error != null) {
    return [, error];
  }

  return [new InfixExpression(token, expression, operator, left)];
};

const parseCallExpression: InfixParserFn = (lexer, functionIdentifier) => {
  const token = lexer.getToken();

  const [argumentsList, error] = parseExpressionList(lexer, TokenType.RPAREN);

  if (error != null) {
    return [, error];
  }

  return [new CallExpression(token, functionIdentifier, argumentsList)];
};

const parseIndexExpression: InfixParserFn = (lexer, left) => {
  const token = lexer.getToken();

  lexer.next();
  const [indexExpression, indexError] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (indexError != null) {
    return [, indexError];
  }

  const [, error] = getNextExpectedToken(lexer, TokenType.RBRACKET);
  if (error != null) {
    return [, error];
  }

  return [new IndexExpression(token, left, indexExpression)];
};

export const InfixParserFns: TokenTypeDictionary<InfixParserFn> = {
  [TokenType.EQ]: parseInfixExpression,
  [TokenType.NOT_EQ]: parseInfixExpression,
  [TokenType.LT]: parseInfixExpression,
  [TokenType.GT]: parseInfixExpression,
  [TokenType.PLUS]: parseInfixExpression,
  [TokenType.MINUS]: parseInfixExpression,
  [TokenType.SLASH]: parseInfixExpression,
  [TokenType.ASTERISK]: parseInfixExpression,
  [TokenType.LPAREN]: parseCallExpression,
  [TokenType.LBRACKET]: parseIndexExpression,
};
