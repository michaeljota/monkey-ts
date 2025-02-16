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

import type {
  TokenTypeDictionary,
  PrefixParserFn,
  PeekableLexer,
  PeekableToken,
  State,
  InfixParserFn,
} from "./types";
import { getNextExpectedTokenPair, getPrecedence, peekable } from "./helpers";

export function parseProgram(lexer: Lexer): Result<Program, string[]> {
  const statements: StatementUnion[] = [];
  const errors: string[] = [];
  const peekableLexer = peekable(lexer);

  let tokenPair = peekableLexer.next().value;

  while (tokenPair.current.type !== TokenType.EOF) {
    const [statement, err] = parseStatement(tokenPair, peekableLexer);

    if (err != null) {
      errors.push(err);
      tokenPair = peekableLexer.next().value;
      continue;
    }

    statements.push(statement);
    tokenPair = peekableLexer.next().value;
  }

  if (errors.length) {
    return [, errors];
  }
  return [new Program(statements)];
}

function parseStatement(
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
): Result<StatementUnion, string> {
  switch (tokenPair.current.type) {
    case TokenType.LET:
      return parseLetStatement(tokenPair, lexer);
    case TokenType.RETURN:
      return parseReturnStatement(tokenPair, lexer);
    default:
      return parseExpressionStatement(tokenPair, lexer);
  }
}

function parseLetStatement(
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
): Result<LetStatement, string> {
  const token = tokenPair.current;

  const [nameTokenPair, nameError] = getNextExpectedTokenPair(tokenPair, TokenType.IDENT, lexer);
  if (nameError != null) {
    return [, nameError];
  }

  const nameToken = nameTokenPair.current;

  const name = new Identifier(nameToken, nameToken.literal);

  const [, assignError] = getNextExpectedTokenPair(nameTokenPair, TokenType.ASSIGN, lexer);
  if (assignError != null) {
    return [, assignError];
  }

  const expressionTokenPair = lexer.next().value;

  const [expressionResult, expressionError] = parseExpression(
    expressionTokenPair,
    ExpressionPrecedence.LOWEST,
    lexer,
  );

  if (expressionError != null) {
    return [, expressionError];
  }

  const { data: value, tokenPair: nextToken } = expressionResult;

  if (nextToken.peek?.type === TokenType.SEMICOLON) {
    lexer.next();
  }

  return [new LetStatement(token, name, value)];
}

function parseReturnStatement(
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
): Result<ReturnStatement, string> {
  const token = tokenPair.current;

  const returnToken = lexer.next().value;

  const [result, error] = parseExpression(returnToken, ExpressionPrecedence.LOWEST, lexer);

  if (error != null) {
    return [, error];
  }

  const { data: expression, tokenPair: nextToken } = result;

  if (nextToken.peek?.type === TokenType.SEMICOLON) {
    lexer.next();
  }

  return [new ReturnStatement(token, expression)];
}

function parseExpressionStatement(
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
): Result<ExpressionStatement, string> {
  const token = tokenPair.current;

  const [result, error] = parseExpression(tokenPair, ExpressionPrecedence.LOWEST, lexer);

  if (error != null) {
    return [, error];
  }

  const { data: expression, tokenPair: nextTokenPair } = result;

  if (nextTokenPair.peek?.type === TokenType.SEMICOLON) {
    lexer.next();
  }

  return [new ExpressionStatement(token, expression)];
}

function parseBlockStatement(
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
): Result<State<BlockStatement>, string> {
  const [nextTokenPair, nextError] = getNextExpectedTokenPair(tokenPair, TokenType.LBRACE, lexer);

  if (nextError != null) {
    return [, nextError];
  }

  const token = nextTokenPair.current;

  const statementTokenPair = lexer.next().value;

  const [result, error] = parseStatements(statementTokenPair, lexer);
  if (error != null) {
    return [, error];
  }
  const { data: statements, tokenPair: latestTokenPair } = result;

  return [{ data: new BlockStatement(token, statements), tokenPair: latestTokenPair }];
}

function parseStatements(
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
  statements: StatementUnion[] = [],
): Result<State<StatementUnion[]>, string> {
  if (tokenPair.current.type === TokenType.RBRACE) {
    return [{ data: statements, tokenPair }];
  }

  const [statement, error] = parseStatement(tokenPair, lexer);
  if (error != null) {
    return [, error];
  }

  statements.push(statement);

  const nextTokenPair = lexer.next().value;

  return parseStatements(nextTokenPair, lexer, statements);
}

function parseExpression(
  tokenPair: PeekableToken,
  precedence: ExpressionPrecedence,
  lexer: PeekableLexer,
): Result<State<ExpressionUnion>, string> {
  const prefixParser = PrefixParserFns[tokenPair.current.type];

  if (!prefixParser) {
    return [, `No prefix parser found for ${tokenPair.current.type}.`];
  }

  const [result, error] = prefixParser(tokenPair, lexer);
  if (error != null) {
    return [, error];
  }

  return parseExpressionWithInfix(result, precedence, lexer);
}

const parseExpressionWithInfix = (
  { data: expression, tokenPair }: State<ExpressionUnion>,
  precedence: ExpressionPrecedence,
  lexer: PeekableLexer,
): Result<State<ExpressionUnion>, string> => {
  if (
    !tokenPair.peek ||
    tokenPair.peek.type === TokenType.SEMICOLON ||
    precedence >= getPrecedence(tokenPair.peek.type)
  ) {
    return [{ data: expression, tokenPair }];
  }

  const infixParser = InfixParserFns[tokenPair.peek.type];

  if (!infixParser) {
    return [{ data: expression, tokenPair }];
  }

  const nextTokenPair = lexer.next().value;
  const [newState, error] = infixParser(nextTokenPair, expression, lexer);
  if (error != null) {
    return [, error];
  }

  return parseExpressionWithInfix(newState, precedence, lexer);
};

const parseIdentifier: PrefixParserFn = (tokenPair) => {
  return [
    {
      data: new Identifier(tokenPair.current, tokenPair.current.literal),
      tokenPair,
    },
  ];
};

const parseIntegerLiteral: PrefixParserFn = (tokenPair) => {
  const token = tokenPair.current;
  const value = Number.parseInt(token.literal, 10);
  const coercionChecker = Number(token.literal);

  if (Number.isNaN(value) || Number.isNaN(coercionChecker)) {
    return [, `Could not parse ${value} as integer`];
  }

  return [{ data: new IntegerLiteral(token, value), tokenPair }];
};

const parseStringLiteral: PrefixParserFn = (tokenPair) => {
  return [
    {
      data: new StringLiteral(tokenPair.current, tokenPair.current.literal),
      tokenPair,
    },
  ];
};

const BooleanTypeToNativeMap: Partial<Record<TokenType, boolean>> = {
  [TokenType.TRUE]: true,
  [TokenType.FALSE]: false,
};

const parseBooleanExpression: PrefixParserFn = (tokenPair) => {
  const value = BooleanTypeToNativeMap[tokenPair.current.type];

  if (value == null) {
    return [, `Could not parse ${value} as boolean`];
  }

  return [{ data: new BooleanLiteral(tokenPair.current, value), tokenPair }];
};

const parseGroupedExpression: PrefixParserFn = (_, lexer) => {
  const tokenPair = lexer.next().value;
  const [result, error] = parseExpression(tokenPair, ExpressionPrecedence.LOWEST, lexer);
  if (error != null) {
    return [, error];
  }

  const { data: expression, tokenPair: expressionTokenPair } = result;

  const [closingParenTokenPair, closingParenError] = getNextExpectedTokenPair(
    expressionTokenPair,
    TokenType.RPAREN,
    lexer,
  );
  if (closingParenError != null) {
    return [, closingParenError];
  }

  return [{ data: expression, tokenPair: closingParenTokenPair }];
};

const parsePrefixExpression: PrefixParserFn = (tokenPair, lexer) => {
  const currentToken = tokenPair.current;
  const operator = tokenPair.current.literal;

  const rightTokenPair = lexer.next().value;

  const [result, error] = parseExpression(rightTokenPair, ExpressionPrecedence.PREFIX, lexer);

  if (error != null) {
    return [, error];
  }
  const { data: expression, tokenPair: latestTokenPair } = result;

  return [
    {
      data: new PrefixExpression(currentToken, operator, expression),
      tokenPair: latestTokenPair,
    },
  ];
};

const parseIfExpression: PrefixParserFn = (tokenPair, lexer) => {
  const token = tokenPair.current;
  const [, expectedLParenError] = getNextExpectedTokenPair(tokenPair, TokenType.LPAREN, lexer);
  if (expectedLParenError != null) {
    return [, expectedLParenError];
  }

  const conditionToken = lexer.next().value;
  const [result, error] = parseExpression(conditionToken, ExpressionPrecedence.LOWEST, lexer);

  if (error != null) {
    return [, error];
  }

  const { data: condition, tokenPair: conditionTokenPair } = result;

  const [consequenceToken, consequenceTokenError] = getNextExpectedTokenPair(
    conditionTokenPair,
    TokenType.RPAREN,
    lexer,
  );

  if (consequenceTokenError != null) {
    return [, consequenceTokenError];
  }

  const [consequenceResult, consequenceError] = parseBlockStatement(consequenceToken, lexer);

  if (consequenceError != null) {
    return [, consequenceError];
  }

  const { data: consequence, tokenPair: elseTokenPair } = consequenceResult;

  const [elseResult, elseError] = parseElseExpression(elseTokenPair, lexer);
  if (elseError != null) {
    return [, elseError];
  }

  const { data: alternative, tokenPair: latestTokenPair } = elseResult;

  return [
    {
      data: new IfExpression(token, condition, consequence, alternative),
      tokenPair: latestTokenPair,
    },
  ];
};

const parseElseExpression = (
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
): Result<State<Maybe<BlockStatement>>, string> => {
  if (tokenPair.peek?.type !== TokenType.ELSE) {
    return [{ data: undefined, tokenPair }];
  }
  const alternativeToken = lexer.next().value;

  const [result, error] = parseBlockStatement(alternativeToken, lexer);
  if (error != null) {
    return [, error];
  }

  return [result];
};

function parseFunctionParameters(
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
): Result<State<Identifier[]>, string> {
  const [, nameError] = getNextExpectedTokenPair(tokenPair, TokenType.LPAREN, lexer);
  if (nameError != null) {
    return [, nameError];
  }

  const nextTokenPair = lexer.next().value;

  if (nextTokenPair.current.type === TokenType.RPAREN) {
    return [{ data: [], tokenPair: nextTokenPair }];
  }

  const [{ parameters, tokenPair: parametersTokenPair }] = parseFunctionParametersList(
    nextTokenPair,
    lexer,
  );

  const [latestTokenPair, error] = getNextExpectedTokenPair(
    parametersTokenPair,
    TokenType.RPAREN,
    lexer,
  );
  if (error != null) {
    return [, error];
  }

  return [{ data: parameters, tokenPair: latestTokenPair }];
}

const parseFunctionParametersList = (
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
  parameters: Identifier[] = [],
): Ok<{ parameters: Identifier[]; tokenPair: PeekableToken }> => {
  const identifier = new Identifier(tokenPair.current, tokenPair.current.literal);

  parameters.push(identifier);

  if (tokenPair.peek?.type !== TokenType.COMMA) {
    return [{ parameters, tokenPair }];
  }

  lexer.next();
  const nextTokenPair = lexer.next().value;
  return parseFunctionParametersList(nextTokenPair, lexer, parameters);
};

const parseFunctionLiteral: PrefixParserFn = (tokenPair, lexer) => {
  const token = tokenPair.current;

  const [result, error] = parseFunctionParameters(tokenPair, lexer);
  if (error != null) {
    return [, error];
  }
  const { data: parameters, tokenPair: parametersTokenPair } = result;

  const [blockResult, blockError] = parseBlockStatement(parametersTokenPair, lexer);
  if (blockError != null) {
    return [, blockError];
  }
  const { data: body, tokenPair: blockTokenPair } = blockResult;

  return [{ data: new FunctionLiteral(token, parameters, body), tokenPair: blockTokenPair }];
};

const parseArgumentsList = (
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
  argumentsList: ExpressionUnion[] = [],
): Result<State<ExpressionUnion[]>, string> => {
  const [state, error] = parseExpression(tokenPair, ExpressionPrecedence.LOWEST, lexer);
  if (error != null) {
    return [, error];
  }

  argumentsList.push(state.data);

  if (state.tokenPair.peek?.type !== TokenType.COMMA) {
    return [{ data: argumentsList, tokenPair: state.tokenPair }];
  }

  lexer.next();
  const nextTokenPair = lexer.next().value;
  return parseArgumentsList(nextTokenPair, lexer, argumentsList);
};

function parseExpressionList(
  closerToken: TokenType,
  lexer: PeekableLexer,
): Result<State<ExpressionUnion[]>, string> {
  const tokenPair = lexer.next().value;
  if (tokenPair.current.type === closerToken) {
    return [{ data: [], tokenPair }];
  }

  const [state, error] = parseArgumentsList(tokenPair, lexer);
  if (error != null) {
    return [, error];
  }

  const [latestTokenPair, nextError] = getNextExpectedTokenPair(
    state.tokenPair,
    closerToken,
    lexer,
  );
  if (nextError != null) {
    return [, nextError];
  }

  return [{ data: state.data, tokenPair: latestTokenPair }];
}

const parseArrayLiteral: PrefixParserFn = (tokenPair, lexer) => {
  const token = tokenPair.current;
  const [state, error] = parseExpressionList(TokenType.RBRACKET, lexer);
  if (error != null) {
    return [, error];
  }

  const { data: argumentsList, tokenPair: latestTokenPair } = state;
  return [{ data: new ArrayLiteral(token, argumentsList), tokenPair: latestTokenPair }];
};

type NativeHashMap = Map<ExpressionUnion, ExpressionUnion>;

const parseHashMap = (
  tokenPair: PeekableToken,
  lexer: PeekableLexer,
  pairs: NativeHashMap = new Map(),
): Result<State<NativeHashMap>, string> => {
  if (tokenPair.peek?.type === TokenType.RBRACE) {
    return [{ data: pairs, tokenPair }];
  }

  const keyTokenPair = lexer.next().value;
  const [keyState, keyError] = parseExpression(keyTokenPair, ExpressionPrecedence.LOWEST, lexer);
  if (keyError != null) {
    return [, keyError];
  }

  const [, error] = getNextExpectedTokenPair(keyState.tokenPair, TokenType.COLON, lexer);
  if (error != null) {
    return [, error];
  }

  const valueTokenPair = lexer.next().value;

  const [valueState, valueError] = parseExpression(
    valueTokenPair,
    ExpressionPrecedence.LOWEST,
    lexer,
  );
  if (valueError != null) {
    return [, valueError];
  }

  pairs.set(keyState.data, valueState.data);

  if (valueState.tokenPair.peek?.type !== TokenType.RBRACE) {
    const [tokenPair, error] = getNextExpectedTokenPair(
      valueState.tokenPair,
      TokenType.COMMA,
      lexer,
    );
    if (error != null) {
      return [, error];
    }

    return parseHashMap(tokenPair, lexer, pairs);
  }

  return parseHashMap(valueState.tokenPair, lexer, pairs);
};

const parseHashLiteral: PrefixParserFn = (tokenPair, lexer) => {
  const token = tokenPair.current;

  const [hashResult, hashError] = parseHashMap(tokenPair, lexer);
  if (hashError != null) {
    return [, hashError];
  }
  const { data: pairs, tokenPair: afterHashTokenPair } = hashResult;

  const [rbracePair, rbraceError] = getNextExpectedTokenPair(
    afterHashTokenPair,
    TokenType.RBRACE,
    lexer,
  );
  if (rbraceError != null) {
    return [, rbraceError];
  }

  return [{ data: new HashLiteral(token, pairs), tokenPair: rbracePair }];
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

const parseInfixExpression: InfixParserFn = (tokenPair, left, lexer) => {
  const token = tokenPair.current;
  const operator = token.literal;
  const precedence = getPrecedence(token.type);

  const rightTokenPair = lexer.next().value;
  const [result, error] = parseExpression(rightTokenPair, precedence, lexer);

  if (error != null) {
    return [, error];
  }

  const { data: expression, tokenPair: latestTokenPair } = result;

  return [
    {
      data: new InfixExpression(token, expression, operator, left),
      tokenPair: latestTokenPair,
    },
  ];
};

const parseCallExpression: InfixParserFn = (tokenPair, functionIdentifier, lexer) => {
  const token = tokenPair.current;

  const [state, error] = parseExpressionList(TokenType.RPAREN, lexer);

  if (error != null) {
    return [, error];
  }

  const { data: argumentsList, tokenPair: latestTokenPair } = state;

  return [
    {
      data: new CallExpression(token, functionIdentifier, argumentsList),
      tokenPair: latestTokenPair,
    },
  ];
};

const parseIndexExpression: InfixParserFn = (tokenPair, left, lexer) => {
  const token = tokenPair.current;

  const indexTokenPair = lexer.next().value;
  const [indexState, indexError] = parseExpression(
    indexTokenPair,
    ExpressionPrecedence.LOWEST,
    lexer,
  );

  if (indexError != null) {
    return [, indexError];
  }

  const [latestTokenPair, error] = getNextExpectedTokenPair(
    indexState.tokenPair,
    TokenType.RBRACKET,
    lexer,
  );
  if (error != null) {
    return [, error];
  }

  return [
    {
      data: new IndexExpression(token, left, indexState.data),
      tokenPair: latestTokenPair,
    },
  ];
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
