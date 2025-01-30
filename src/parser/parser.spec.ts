import { describe, expect, it, test } from "bun:test";
import { Lexer } from "::lexer/lexer";
import {
  AstStatementType,
  BooleanLiteral,
  ExpressionStatement,
  Identifier as Identifier,
  InfixExpression,
  IntegerLiteral,
  LetStatement,
  PrefixExpression,
  FunctionLiteral,
  Program,
  type Expression,
  IfExpression,
  CallExpression,
} from "::ast";
import { Parser } from "./parser";
import { TokenType } from "::token";

describe("Parser", () => {
  it("should parse the program", () => {
    const input = `
      let x = 5;
      let y = 10;
      let foobar = 838383;
    `;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    let program: Program;

    expect(() => {
      program = parser.parseProgram();
    }).not.toThrow();

    expect(program!.statements).toHaveLength(3);
  });

  it("should parse let statements", () => {
    const input = `
      let x = 5;
      let y = 10;
      let foobar = 838383;
    `;

    const expectedIdentifiers = ["x", "y", "foobar"];

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(program.statements).toBeArrayOfSize(3);
    expect(parser.errors).toBeEmpty();

    program.statements.forEach((statement, i) => {
      const expectedIdentifier = expectedIdentifiers[i];

      expect(statement.tokenLiteral()).toBe("let");
      expect(statement.type).toBe(AstStatementType.Let);
      const letStatement = statement as LetStatement;

      expect(letStatement.name.value).toBe(expectedIdentifier);
      expect(letStatement.name.tokenLiteral()).toBe(expectedIdentifier);
    });
  });

  it("should handle errors for let statements", () => {
    const input = `
      let y 10;
      let 10;
    `;

    const expectedTokens = ["=", "IDENT"];
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    parser.parseProgram();

    expect(parser.errors).toHaveLength(2);

    parser.errors.forEach((error, i) => {
      const expectedToken = expectedTokens[i];

      expect(error).toContain(`Next token expected to be ${expectedToken},`);
    });
  });

  it("should parse return statements", () => {
    const input = `
      return 1;
      return 50;
      return 7890;
    `;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(program.statements).toBeArrayOfSize(3);
    expect(parser.errors).toBeEmpty();

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

  it("should parse identifier expressions", () => {
    const input = `foobar;`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    testLiteralExpression((statement as ExpressionStatement).expression, "foobar");
  });

  it("should parse integer literal expressions", () => {
    const input = `5;`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    testLiteralExpression((statement as ExpressionStatement).expression, 5);
  });

  it("should parse boolean literal true expressions", () => {
    const input = `true;`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    testLiteralExpression((statement as ExpressionStatement).expression, true);
  });

  it("should parse boolean literal false expressions", () => {
    const input = `false;`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    testLiteralExpression((statement as ExpressionStatement).expression, false);
  });

  it("should parse if expressions", () => {
    const input = `if (x < y) { x }`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    const ifExpression = (statement as ExpressionStatement).expression as IfExpression;

    expect(ifExpression).toBeInstanceOf(IfExpression);

    testInfixExpression(ifExpression.condition, "x", "<", "y");

    expect(ifExpression.consequence.statements).toHaveLength(1);
    const [consequenceStatement] = ifExpression.consequence.statements;

    expect(consequenceStatement).toBeInstanceOf(ExpressionStatement);

    testIdentifier((consequenceStatement as ExpressionStatement).expression, "x");

    expect(ifExpression.alternative).toBeUndefined();
  });

  it("should parse if-else expressions", () => {
    const input = `if (x < y) { x } else { y }`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    const ifExpression = (statement as ExpressionStatement).expression as IfExpression;

    expect(ifExpression).toBeInstanceOf(IfExpression);

    testInfixExpression(ifExpression.condition, "x", "<", "y");

    expect(ifExpression.consequence.statements).toHaveLength(1);
    const [consequenceStatement] = ifExpression.consequence.statements;

    expect(consequenceStatement).toBeInstanceOf(ExpressionStatement);

    testIdentifier((consequenceStatement as ExpressionStatement).expression, "x");

    expect(ifExpression.alternative?.statements).toHaveLength(1);
    const [alternativeStatement] = ifExpression.alternative?.statements ?? [];
    testIdentifier((alternativeStatement as ExpressionStatement).expression, "y");
  });

  it("should parse function literal expressions", () => {
    const input = `fn(x,y) { x + y }`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    const functionLiteral = (statement as ExpressionStatement).expression as FunctionLiteral;

    expect(functionLiteral).toBeInstanceOf(FunctionLiteral);

    expect(functionLiteral.parameters).toHaveLength(2);

    testLiteralExpression(functionLiteral.parameters[0], "x");
    testLiteralExpression(functionLiteral.parameters[1], "y");

    expect(functionLiteral.body.statements).toHaveLength(1);
    const bodyExpression = functionLiteral.body.statements[0] as ExpressionStatement;

    testInfixExpression(bodyExpression.expression, "x", "+", "y");
  });

  it("should fail to parse function literal, if a parenthesis is missing", () => {
    const input = `fn(x,y { x + y }`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    parser.parseProgram();

    expect(parser.errors).not.toBeEmpty();
    expect(parser.errors).toContain("Next token expected to be ), but found { instead.");
  });

  const extendedFunctionTestCases: [input: string, expectedParams: string[]][] = [
    ["fn() {};", []],
    ["fn(x) {};", ["x"]],
    ["fn(x, y) {};", ["x", "y"]],
  ];

  extendedFunctionTestCases.forEach(([input, expectedParams]) => {
    it(`should parse function ${input} with arguments ${expectedParams}`, () => {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toBeEmpty();
      expect(program.statements).toHaveLength(1);

      const [statement] = program.statements;

      expect(statement).toBeInstanceOf(ExpressionStatement);

      const functionLiteral = (statement as ExpressionStatement).expression as FunctionLiteral;

      expect(functionLiteral).toBeInstanceOf(FunctionLiteral);

      expect(functionLiteral.parameters).toBeArrayOfSize(expectedParams.length);

      functionLiteral.parameters.forEach((param, i) =>
        testLiteralExpression(param, expectedParams.at(i)),
      );
    });
  });

  it("should parse call expressions", () => {
    const input = "add(1, 2 * 3, 4 + 5);";
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    expect(parser.errors).toBeEmpty();
    expect(program.statements).toHaveLength(1);

    const [statement] = program.statements;

    expect(statement).toBeInstanceOf(ExpressionStatement);

    const callExpression = (statement as ExpressionStatement).expression as CallExpression;

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
    it(`should parse unary operations ${input}`, () => {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toBeEmpty();
      expect(program.statements).toHaveLength(1);

      const [statement] = program.statements;

      expect(statement).toBeInstanceOf(ExpressionStatement);

      const prefixExpression = (statement as ExpressionStatement).expression as PrefixExpression;

      expect(prefixExpression).toBeInstanceOf(PrefixExpression);

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
    it(`should parse binary operation ${input}`, () => {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toBeEmpty();
      expect(program.statements).toHaveLength(1);

      const [statement] = program.statements;

      expect(statement).toBeInstanceOf(ExpressionStatement);

      const { expression } = statement as ExpressionStatement;

      testInfixExpression(expression, left, operator, right);
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
  ];

  precedenceGroupingTesting.forEach(([input, expected]) =>
    it(`should parse and group oprations by precedence ${input}`, () => {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toBeEmpty();
      expect(`${program}`).toBe(expected);
    }),
  );
});

const testLiteralExpression = (expression: Expression, value: unknown): void => {
  switch (typeof value) {
    case "number": {
      return testIntegerLiteral(expression, value);
    }
    case "string": {
      return testIdentifier(expression, value);
    }
    case "boolean": {
      return testBooleanLiteral(expression, value);
    }
    default: {
      throw new Error(`Unsupported 'expected' type: ${typeof value}`);
    }
  }
};

const testIntegerLiteral = (expression: Expression, value: number): void => {
  const integerLiteral = expression as IntegerLiteral;

  expect(integerLiteral).toBeInstanceOf(IntegerLiteral);
  expect(integerLiteral.value).toBe(value);
  expect(integerLiteral.tokenLiteral()).toBe(`${value}`);
};

const testIdentifier = (expression: Expression, value: string): void => {
  const identifier = expression as Identifier;

  expect(identifier).toBeInstanceOf(Identifier);
  expect(identifier.value).toBe(value);
  expect(identifier.tokenLiteral()).toBe(value);
};

const testBooleanLiteral = (expression: Expression, value: boolean): void => {
  const booleanLiteral = expression as BooleanLiteral;

  expect(booleanLiteral).toBeInstanceOf(BooleanLiteral);
  expect(booleanLiteral.value).toBe(value);
  expect(booleanLiteral.tokenLiteral()).toBe(`${value}`);
};

export const testInfixExpression = (
  expression: Expression,
  left: unknown,
  operator: string,
  right: unknown,
): void => {
  const infixExpression = expression as InfixExpression;

  expect(infixExpression).toBeInstanceOf(InfixExpression);

  testLiteralExpression(infixExpression.left, left);
  expect(infixExpression.operator).toBe(operator);
  testLiteralExpression(infixExpression.right, right);
};
