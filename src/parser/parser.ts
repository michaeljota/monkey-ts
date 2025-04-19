import { computed, event, state, type ComputedState, type Event } from "signux";
import { microDebounce } from "signux/operators";
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
import { waitUntil } from "::helpers";

export type Parser = {
  $program: ComputedState<Program>;
  $errors: ComputedState<string[]>;
  $done: ComputedState<boolean>;
  start: Event;
};

export function createParser(lexer: Lexer): Parser {
  const addStatement = event<StatementUnion>();
  const $statements = state<StatementUnion[]>([])
    .on(addStatement, (statements, statement) => [...statements, statement])
    .create();
  const addError = event<string>();
  const $errors = state<string[]>([])
    .on(addError, (errors, error) => [...errors, error])
    .create();

  const $program = computed(() => new Program($statements()));
  const $done = computed(() => lexer.$currentToken().type === TokenType.EOF);

  const start = event();
  const tick = event();
  lexer.$currentToken.pipe(microDebounce()).subscribe(() => tick());

  tick.subscribe(() => {
    if ($done()) {
      return;
    }

    const [statement, err] = parseStatement(lexer);

    if (err != null) {
      addError(err);
    } else {
      addStatement(statement);
    }

    lexer.advanceToken();
  });

  start.subscribe(() => lexer.restart());

  return {
    $errors,
    $program,
    $done,
    start,
  };
}

export async function parseProgram(lexer: Lexer): Promise<Program> {
  const parser = createParser(lexer);
  parser.start();

  await waitUntil(parser.$done);

  if (parser.$errors().length) {
    throw new Error(parser.$errors().join(",\n"));
  }

  return parser.$program();
}

function parseStatement(lexer: Lexer): Result<StatementUnion, string> {
  const token = lexer.$currentToken();
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
  const token = lexer.$currentToken();

  const [nameToken, nameError] = getNextExpectedToken(lexer, TokenType.IDENT);
  if (nameError != null) {
    return [, nameError];
  }

  const name = new Identifier(nameToken, nameToken.literal);

  const [, assignError] = getNextExpectedToken(lexer, TokenType.ASSIGN);
  if (assignError != null) {
    return [, assignError];
  }

  lexer.advanceToken();

  const [expressionValue, expressionError] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (expressionError != null) {
    return [, expressionError];
  }

  if (lexer.$previewToken()?.type === TokenType.SEMICOLON) {
    lexer.advanceToken();
  }

  return [new LetStatement(token, name, expressionValue)];
}

function parseReturnStatement(lexer: Lexer): Result<ReturnStatement, string> {
  const token = lexer.$currentToken();
  lexer.advanceToken();

  const [expressionValue, error] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (error != null) {
    return [, error];
  }

  if (lexer.$previewToken()?.type === TokenType.SEMICOLON) {
    lexer.advanceToken();
  }

  return [new ReturnStatement(token, expressionValue)];
}

function parseExpressionStatement(lexer: Lexer): Result<ExpressionStatement, string> {
  const token = lexer.$currentToken();

  const [expressionValue, error] = parseExpression(lexer, ExpressionPrecedence.LOWEST);

  if (error != null) {
    return [, error];
  }

  if (lexer.$previewToken()?.type === TokenType.SEMICOLON) {
    lexer.advanceToken();
  }

  return [new ExpressionStatement(token, expressionValue)];
}

function parseBlockStatement(lexer: Lexer): Result<BlockStatement, string> {
  const [token, nextError] = getNextExpectedToken(lexer, TokenType.LBRACE);

  if (nextError != null) {
    return [, nextError];
  }

  lexer.advanceToken();

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
  if (lexer.$currentToken().type === TokenType.RBRACE) {
    return [statements];
  }

  const [statement, error] = parseStatement(lexer);
  if (error != null) {
    return [, error];
  }

  lexer.advanceToken();
  return parseStatements(lexer, [...statements, statement]);
}

function parseExpression(
  lexer: Lexer,
  precedence: ExpressionPrecedence,
): Result<ExpressionUnion, string> {
  const token = lexer.$currentToken();
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
  const peekToken = lexer.$previewToken();
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

  lexer.advanceToken();

  const [newState, error] = infixParser(lexer, expression);
  if (error != null) {
    return [, error];
  }

  return parseExpressionWithInfix(newState, precedence, lexer);
}

const parseIdentifier: PrefixParserFn = (lexer) => {
  const token = lexer.$currentToken();
  return [new Identifier(token, token.literal)];
};

const parseIntegerLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.$currentToken();
  const value = Number.parseInt(token.literal, 10);
  const coercionChecker = Number(token.literal);

  if (Number.isNaN(value) || Number.isNaN(coercionChecker)) {
    return [, `Could not parse ${value} as integer`];
  }

  return [new IntegerLiteral(token, value)];
};

const parseStringLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.$currentToken();
  return [new StringLiteral(token, token.literal)];
};

const BooleanTypeToNativeMap: Partial<Record<TokenType, boolean>> = {
  [TokenType.TRUE]: true,
  [TokenType.FALSE]: false,
};

const parseBooleanExpression: PrefixParserFn = (lexer) => {
  const token = lexer.$currentToken();
  const value = BooleanTypeToNativeMap[token.type];

  if (value == null) {
    return [, `Could not parse ${value} as boolean`];
  }

  return [new BooleanLiteral(token, value)];
};

const parseGroupedExpression: PrefixParserFn = (lexer) => {
  lexer.advanceToken();
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
  const token = lexer.$currentToken();
  const operator = token.literal;

  lexer.advanceToken();

  const [expression, error] = parseExpression(lexer, ExpressionPrecedence.PREFIX);

  if (error != null) {
    return [, error];
  }

  return [new PrefixExpression(token, operator, expression)];
};

const parseIfExpression: PrefixParserFn = (lexer) => {
  const token = lexer.$currentToken();
  const [, expectedLParenError] = getNextExpectedToken(lexer, TokenType.LPAREN);
  if (expectedLParenError != null) {
    return [, expectedLParenError];
  }

  lexer.advanceToken();
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
  if (lexer.$previewToken()?.type !== TokenType.ELSE) {
    return [undefined];
  }
  lexer.advanceToken();

  return parseBlockStatement(lexer);
};

const parseFunctionLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.$currentToken();

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

  lexer.advanceToken();

  if (lexer.$currentToken().type === TokenType.RPAREN) {
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
  const token = lexer.$currentToken();
  const identifier = new Identifier(token, token.literal);

  if (lexer.$previewToken()?.type !== TokenType.COMMA) {
    return [[...parameters, identifier]];
  }

  lexer.advanceToken();
  lexer.advanceToken();
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

  if (lexer.$previewToken()?.type !== TokenType.COMMA) {
    return [[...argumentsList, argument]];
  }

  lexer.advanceToken();
  lexer.advanceToken();
  return parseArgumentsList(lexer, [...argumentsList, argument]);
};

function parseExpressionList(
  lexer: Lexer,
  closerToken: TokenType,
): Result<ExpressionUnion[], string> {
  lexer.advanceToken();

  if (lexer.$currentToken().type === closerToken) {
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
  const token = lexer.$currentToken();
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
  if (lexer.$previewToken()?.type === TokenType.RBRACE) {
    return [pairs];
  }

  lexer.advanceToken();
  const [keyExpression, keyError] = parseExpression(lexer, ExpressionPrecedence.LOWEST);
  if (keyError != null) {
    return [, keyError];
  }

  const [, error] = getNextExpectedToken(lexer, TokenType.COLON);
  if (error != null) {
    return [, error];
  }

  lexer.advanceToken();

  const [valueExpression, valueError] = parseExpression(lexer, ExpressionPrecedence.LOWEST);
  if (valueError != null) {
    return [, valueError];
  }

  pairs.set(keyExpression, valueExpression);

  if (lexer.$previewToken()?.type !== TokenType.RBRACE) {
    const [, error] = getNextExpectedToken(lexer, TokenType.COMMA);
    if (error != null) {
      return [, error];
    }

    return parseHashMap(lexer, pairs);
  }

  return parseHashMap(lexer, pairs);
};

const parseHashLiteral: PrefixParserFn = (lexer) => {
  const token = lexer.$currentToken();

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
  const token = lexer.$currentToken();
  const operator = token.literal;
  const precedence = getPrecedence(token.type);

  lexer.advanceToken();

  const [expression, error] = parseExpression(lexer, precedence);

  if (error != null) {
    return [, error];
  }

  return [new InfixExpression(token, expression, operator, left)];
};

const parseCallExpression: InfixParserFn = (lexer, functionIdentifier) => {
  const token = lexer.$currentToken();

  const [argumentsList, error] = parseExpressionList(lexer, TokenType.RPAREN);

  if (error != null) {
    return [, error];
  }

  return [new CallExpression(token, functionIdentifier, argumentsList)];
};

const parseIndexExpression: InfixParserFn = (lexer, left) => {
  const token = lexer.$currentToken();

  lexer.advanceToken();
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
