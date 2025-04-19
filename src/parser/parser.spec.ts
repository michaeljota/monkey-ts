import { describe, expect, it } from "bun:test";
import { createLexer } from "::lexer/lexer";
import {
  ArrayLiteral,
  AstExpressionType,
  AstStatementType,
  BooleanLiteral,
  CallExpression,
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
  StringLiteral,
  type Expression,
  type ExpressionUnion,
  type Statement,
} from "::ast";
import { TokenType } from "::token";
import { parseProgram } from "./parser";

const setupProgram = async (input: string): Promise<Result<Program, string[]>> => {
  const lexer = createLexer(input);
  const result = await parseProgram(lexer);
  return result;
};

function testResult<T, E>(result: Result<T, E>): asserts result is Ok<T> {
  expect(result[1]).toBeUndefined();
  expect(result[0]).toBeDefined();
}

describe("Parser", () => {
  it("should parse the program", () => {
    const input = `
      let x = 5;
      let y = 10;
      let foobar = 838383;
    `;

    let program: Program;

    expect(async () => {
      const result = await setupProgram(input);
      testResult(result);
      program = result[0];
    }).not.toThrow();

    expect(program!.statements).toBeArrayOfSize(3);
  });

  it("should parse let statements", async () => {
    const input = `
      let x = 5;
      let y = 10;
      let foobar = 838383;
    `;

    const expectedIdentifiers = ["x", "y", "foobar"];

    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;

    expect(program.statements).toBeArrayOfSize(3);

    program.statements.forEach((statement, i) => {
      const expectedIdentifier = expectedIdentifiers[i];

      expect(statement.tokenLiteral()).toBe("let");
      expect(statement.type).toBe(AstStatementType.Let);
      const letStatement = statement as LetStatement;

      expect(letStatement.name.value).toBe(expectedIdentifier);
      expect(letStatement.name.tokenLiteral()).toBe(expectedIdentifier);
    });
  });

  it("should handle errors for let statements", async () => {
    const input = `
      let y 10;
      let 10;
    `;

    const expectedTokens = ["=", "IDENT"];
    const [, errors] = await setupProgram(input);

    expect(errors).toBeArrayOfSize(2);

    errors!.forEach((error, i) => {
      const expectedToken = expectedTokens[i];

      expect(error).toContain(`Next token expected to be ${expectedToken},`);
    });
  });

  it("should parse return statements", async () => {
    const input = `
      return 1;
      return 50;
      return 7890;
    `;

    const result = await setupProgram(input);
    testResult(result);

    const [program] = result;
    expect(program.statements).toBeArrayOfSize(3);

    program.statements.forEach((statement) => {
      expect(statement.tokenLiteral()).toBe("return");
      expect(statement.type).toBe(AstStatementType.Return);
    });
  });

  it("should create a stringify version of the tree", () => {
    const statements = [
      new LetStatement(
        { literal: "let", type: TokenType.LET },
        new Identifier({ literal: "foo", type: TokenType.IDENT }, "foo"),
        new IntegerLiteral({ literal: "50", type: TokenType.INT }, 50),
      ),
    ];

    const program = new Program(statements);

    expect(`${program}`).toBe("let foo = 50;");
  });

  it("should parse identifier expressions", async () => {
    const input = `foobar;`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    testLiteralExpression(statement.expression, "foobar");
  });

  it("should parse integer literal expressions", async () => {
    const input = `5;`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    testLiteralExpression(statement.expression, 5);
  });

  it("should parse string literal expressions", async () => {
    const input = `"hello world";`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    testLiteralExpression(statement.expression, "hello world");
  });

  it("should parse boolean literal true expressions", async () => {
    const input = `true;`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    testLiteralExpression(statement.expression, true);
  });

  it("should parse boolean literal false expressions", async () => {
    const input = `false;`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    testLiteralExpression(statement.expression, false);
  });

  it("should parse array literal expressions", async () => {
    const input = "[1, 2 + 3, 4 * 5];";
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const arrayLiteral = getTestedExpression(statement.expression, ArrayLiteral);
    expect(arrayLiteral.elements).toBeArrayOfSize(3);

    testLiteralExpression(arrayLiteral.elements[0], 1);
    testInfixExpression(arrayLiteral.elements[1], 2, "+", 3);
    testInfixExpression(arrayLiteral.elements[2], 4, "*", 5);
  });

  it("should parse array index expressions", async () => {
    const input = "myArray[1 + 1];";
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const indexExpression = getTestedExpression(statement.expression, IndexExpression);

    testIdentifier(indexExpression.left, "myArray");
    testInfixExpression(indexExpression.index, 1, "+", 1);
  });

  it("should parse hash expressions with string keys", async () => {
    const input = '{ "one": 1, "two": 2, "three": 3 }';

    const expected = new Map([
      ["one", 1],
      ["two", 2],
      ["three", 3],
    ]);

    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const hashLiteral = getTestedExpression(statement.expression, HashLiteral);

    expect(hashLiteral.pairs.size).toBe(3);

    hashLiteral.pairs.forEach((value, key) => {
      expect(key).toBeInstanceOf(StringLiteral);
      const expectedValue = expected.get((key as StringLiteral).value);
      testLiteralExpression(value, expectedValue);
    });
  });

  it("should parse empty hash expressions", async () => {
    const input = "{}";

    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const hashLiteral = getTestedExpression(statement.expression, HashLiteral);

    expect(hashLiteral.pairs).toBeEmpty();
  });

  it("should parse if expressions", async () => {
    const input = `if (x < y) { x }`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const ifExpression = getTestedExpression(statement.expression, IfExpression);

    expect(ifExpression).toBeInstanceOf(IfExpression);

    testInfixExpression(ifExpression.condition, "x", "<", "y");

    expect(ifExpression.consequence.statements).toBeArrayOfSize(1);

    const consequenceStatement = getTestedStatement(
      ifExpression.consequence.statements.at(0),
      ExpressionStatement,
    );

    testIdentifier(consequenceStatement.expression, "x");

    expect(ifExpression.alternative).toBeUndefined();
  });

  it("should parse if-else expressions", async () => {
    const input = `if (x < y) { x } else { y }`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const ifExpression = getTestedExpression(statement.expression, IfExpression);

    expect(ifExpression).toBeInstanceOf(IfExpression);

    testInfixExpression(ifExpression.condition, "x", "<", "y");

    expect(ifExpression.consequence.statements).toBeArrayOfSize(1);

    const consequenceStatement = getTestedStatement(
      ifExpression.consequence.statements.at(0),
      ExpressionStatement,
    );

    testIdentifier(consequenceStatement.expression, "x");

    expect(ifExpression.alternative?.statements).toBeArrayOfSize(1);

    const alternativeStatement = getTestedStatement(
      ifExpression.alternative?.statements.at(0),
      ExpressionStatement,
    );

    testIdentifier(alternativeStatement.expression, "y");
  });

  it("should parse function literal expressions", async () => {
    const input = `fn(x,y) { x + y }`;
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const functionLiteral = getTestedExpression(statement.expression, FunctionLiteral);

    expect(functionLiteral.parameters).toBeArrayOfSize(2);

    testLiteralExpression(functionLiteral.parameters[0], "x");
    testLiteralExpression(functionLiteral.parameters[1], "y");

    expect(functionLiteral.body.statements).toBeArrayOfSize(1);

    const bodyStatement = getTestedStatement(
      functionLiteral.body.statements.at(0),
      ExpressionStatement,
    );

    testInfixExpression(bodyStatement.expression, "x", "+", "y");
  });

  it("should fail to parse function literal, if a parenthesis is missing", async () => {
    const input = `fn(x,y { x + y }`;

    const [, errors] = await setupProgram(input);

    expect(errors).not.toBeEmpty();
    expect(errors).toContain("Next token expected to be ), but found { instead.");
  });

  const extendedFunctionTestCases: [input: string, expectedParams: string[]][] = [
    ["fn() {};", []],
    ["fn(x) {};", ["x"]],
    ["fn(x, y) {};", ["x", "y"]],
  ];

  extendedFunctionTestCases.forEach(([input, expectedParams]) => {
    it(`should parse function ${input} with ${expectedParams.length ? `arguments ${expectedParams}` : "no arguments"}`, async () => {
      const result = await setupProgram(input);
      testResult(result);
      const [program] = result;
      const statement = getTestedBaseStatement(program);

      const functionLiteral = getTestedExpression(statement.expression, FunctionLiteral);

      expect(functionLiteral.parameters).toBeArrayOfSize(expectedParams.length);

      functionLiteral.parameters.forEach((param, i) =>
        testLiteralExpression(param, expectedParams.at(i)),
      );
    });
  });

  it("should parse call expressions", async () => {
    const input = "add(1, 2 * 3, 4 + 5);";
    const result = await setupProgram(input);
    testResult(result);
    const [program] = result;
    const statement = getTestedBaseStatement(program);

    const callExpression = getTestedExpression(statement.expression, CallExpression);

    testIdentifier(callExpression.functionIdentifier, "add");

    expect(callExpression.functionArguments).toBeArrayOfSize(3);
    testLiteralExpression(callExpression.functionArguments[0], 1);
    testInfixExpression(callExpression.functionArguments[1], 2, "*", 3);
    testInfixExpression(callExpression.functionArguments[2], 4, "+", 5);
  });

  const unaryTestCases: [input: string, operator: string, value: unknown][] = [
    ["!5", "!", 5],
    ["-15", "-", 15],
    // Boolean tests
    ["!true;", "!", true],
    ["!false;", "!", false],
  ];

  unaryTestCases.forEach(([input, operator, value]) =>
    it(`should parse unary operations ${input}`, async () => {
      const result = await setupProgram(input);
      testResult(result);
      const [program] = result;
      const statement = getTestedBaseStatement(program);

      const prefixExpression = getTestedExpression(statement.expression, PrefixExpression);

      expect(prefixExpression.operator).toBe(operator);
      testLiteralExpression(prefixExpression.right, value);
    }),
  );

  const binaryTestCases: [input: string, left: unknown, operator: string, right: unknown][] = [
    ["1 + 5", 1, "+", 5],
    ["2 - 5", 2, "-", 5],
    ["3 * 5", 3, "*", 5],
    ["4 / 5", 4, "/", 5],
    ["1 > 5", 1, ">", 5],
    ["2 < 5", 2, "<", 5],
    ["3 == 5", 3, "==", 5],
    ["4 != 5", 4, "!=", 5],
    ["true == true", true, "==", true],
    ["true != false", true, "!=", false],
    ["false == false", false, "==", false],
  ];

  binaryTestCases.forEach(([input, left, operator, right]) =>
    it(`should parse binary operation ${input}`, async () => {
      const result = await setupProgram(input);
      testResult(result);
      const [program] = result;
      const statement = getTestedBaseStatement(program);

      testInfixExpression(statement.expression, left, operator, right);
    }),
  );

  const precedenceGroupingTesting: [input: string, expected: string][] = [
    ["-a * b", "((-a) * b)"],
    ["!-a", "(!(-a))"],
    ["a + b + c", "((a + b) + c)"],
    ["a + b - c", "((a + b) - c)"],
    ["a * b * c", "((a * b) * c)"],
    ["a * b / c", "((a * b) / c)"],
    ["a + b / c", "(a + (b / c))"],
    ["a + b * c + d / e - f", "(((a + (b * c)) + (d / e)) - f)"],
    ["3 + 4; -5 * 5", "(3 + 4)((-5) * 5)"],
    ["5 > 4 == 3 < 4", "((5 > 4) == (3 < 4))"],
    ["5 < 4 != 3 > 4", "((5 < 4) != (3 > 4))"],
    ["3 + 4 * 5 == 3 * 1 + 4 * 5", "((3 + (4 * 5)) == ((3 * 1) + (4 * 5)))"],
    ["3 + 4 * 5 == 3 * 1 + 4 * 5", "((3 + (4 * 5)) == ((3 * 1) + (4 * 5)))"],
    // Boolean tests
    ["true", "true"],
    ["false", "false"],
    ["3 > 5 == false", "((3 > 5) == false)"],
    ["3 < 5 == true", "((3 < 5) == true)"],
    // Parentesis grouping tests
    ["1 + (2 + 3) + 4", "((1 + (2 + 3)) + 4)"],
    ["(5 + 5) * 2", "((5 + 5) * 2)"],
    ["2 / (5 + 5)", "(2 / (5 + 5))"],
    ["-(5 + 5)", "(-(5 + 5))"],
    ["!(true == true)", "(!(true == true))"],
    // Functions
    ["a + add (b * c) + d", "((a + add ((b * c))) + d)"],
    [
      "add (a, b, 1, 2 * 3, 4 + 5, add (6, 7 * 8))",
      "add (a, b, 1, (2 * 3), (4 + 5), add (6, (7 * 8)))",
    ],
    ["add (a + b + c * d / f + g)", "add ((((a + b) + ((c * d) / f)) + g))"],
    ["a * [1, 2, 3, 4][b * c] * d", "((a * ([1,2,3,4][(b * c)])) * d)"],
    ["add(a * b[2], b[1], 2 * [1, 2][1])", "add ((a * (b[2])), (b[1]), (2 * ([1,2][1])))"],
  ];

  precedenceGroupingTesting.forEach(([input, expected]) =>
    it(`should parse and group operations by precedence ${input}`, async () => {
      const result = await setupProgram(input);
      testResult(result);
      const [program] = result;

      expect(`${program}`).toBe(expected);
    }),
  );
});

/* eslint-disable @typescript-eslint/no-unsafe-argument -- We want to be able to send "any" data, and test that we are handling it correctly.  */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testLiteralExpression = (expression: ExpressionUnion, value: any): void => {
  switch (expression.type) {
    case AstExpressionType.Integer: {
      return testIntegerLiteral(expression, value);
    }
    case AstExpressionType.Identifier: {
      return testIdentifier(expression, value);
    }
    case AstExpressionType.Boolean: {
      return testBooleanLiteral(expression, value);
    }
    case AstExpressionType.String: {
      return testStringLiteral(expression, value);
    }
    default: {
      throw new Error(`Unsupported 'expected' type: ${typeof value}`);
    }
  }
};
/* eslint-enable @typescript-eslint/no-unsafe-argument */

const testIntegerLiteral = (expression: Expression, value: number): void => {
  const integerLiteral = getTestedExpression(expression, IntegerLiteral);
  expect(integerLiteral.value).toBe(value);
  expect(integerLiteral.tokenLiteral()).toBe(`${value}`);
};

const testStringLiteral = (expression: Expression, value: string): void => {
  const stringLiteral = getTestedExpression(expression, StringLiteral);
  expect(stringLiteral.value).toBe(value);
  expect(stringLiteral.tokenLiteral()).toBe(`${value}`);
};

const testIdentifier = (expression: Expression, value: string): void => {
  const identifier = getTestedExpression(expression, Identifier);
  expect(identifier.value).toBe(value);
  expect(identifier.tokenLiteral()).toBe(value);
};

const testBooleanLiteral = (expression: Expression, value: boolean): void => {
  const booleanLiteral = getTestedExpression(expression, BooleanLiteral);

  expect(booleanLiteral.value).toBe(value);
  expect(booleanLiteral.tokenLiteral()).toBe(`${value}`);
};

const testInfixExpression = (
  expression: Expression,
  left: unknown,
  operator: string,
  right: unknown,
): void => {
  const infixExpression = getTestedExpression(expression, InfixExpression);

  testLiteralExpression(infixExpression.left, left);
  expect(infixExpression.operator).toBe(operator);
  testLiteralExpression(infixExpression.right, right);
};

const getTestedBaseStatement = (program: Program): ExpressionStatement => {
  expect(program.statements).toBeArrayOfSize(1);

  const [statement] = program.statements;

  expect(statement).toBeInstanceOf(ExpressionStatement);

  return statement as ExpressionStatement;
};

const getTestedExpression = <E extends Expression>(
  expression: Expression,
  expressionClass: Newable<E>,
): E => {
  expect(expression).toBeInstanceOf(expressionClass);

  return expression as E;
};

const getTestedStatement = <S extends Statement>(
  statement: Statement | undefined,
  statementClass: Newable<S>,
): S => {
  expect(statement).toBeInstanceOf(statementClass);

  return statement as S;
};
