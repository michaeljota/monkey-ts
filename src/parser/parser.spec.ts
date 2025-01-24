import { describe, expect, it, test } from "bun:test";
import { Lexer } from "::lexer/lexer";
import {
  AstStatementType,
  ExpressionStatement,
  Identifier as Identifier,
  InfixExpression,
  IntegerLiteral,
  LetStatement,
  PrefixExpression,
  Program,
  type Expression,
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

    expect(program.statements).toHaveLength(3);
    expect(parser.errors).toHaveLength(0);

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

    expect(program.statements).toHaveLength(3);
    expect(parser.errors).toHaveLength(0);

    program.statements.forEach((statement) => {
      expect(statement.tokenLiteral()).toBe("return");
      expect(statement.type).toBe(AstStatementType.Return);
    });
  });

  it("should create a stringify version of the tree", () => {
    const program = new Program();

    program.statements = [
      new LetStatement(
        { literal: "let", type: TokenType.LET },
        {
          name: new Identifier(
            { literal: "foo", type: TokenType.IDENT },
            { value: "foo" }
          ),
          value: new Identifier(
            { literal: "50", type: TokenType.INT },
            { value: "50" }
          ),
        }
      ),
    ];

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

    const identifier = (statement as ExpressionStatement)
      .expression as Identifier;

    expect(identifier).toBeInstanceOf(Identifier);
    expect(identifier.value).toBe("foobar");
    expect(identifier.tokenLiteral()).toBe("foobar");
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

    const integerLiteral = (statement as ExpressionStatement)
      .expression as IntegerLiteral;

    expect(integerLiteral).toBeInstanceOf(IntegerLiteral);
    expect(integerLiteral.value).toBe(5);
    expect(integerLiteral.tokenLiteral()).toBe("5");
  });

  interface ParsingPrefixTestCase {
    input: string;
    operator: string;
    value: number;
  }

  const unaryTestCases: ParsingPrefixTestCase[] = [
    { input: "!5", operator: "!", value: 5 },
    { input: "-15", operator: "-", value: 15 },
  ];

  unaryTestCases.forEach(({ input, operator, value }) =>
    it(`should parse unary operations ${input}`, () => {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toBeEmpty();
      expect(program.statements).toHaveLength(1);

      const [statement] = program.statements;

      expect(statement).toBeInstanceOf(ExpressionStatement);

      const prefixExpression = (statement as ExpressionStatement)
        .expression as PrefixExpression;

      expect(prefixExpression).toBeInstanceOf(PrefixExpression);

      expect(prefixExpression.operator).toBe(operator);

      testIntegerLiteral(prefixExpression.right, value);
    })
  );

  interface ParsingInfixTestCase {
    input: string;
    leftValue: number;
    operator: string;
    rightValue: number;
  }

  const binaryTestCases: ParsingInfixTestCase[] = [
    { input: "5 + 5", operator: "+", rightValue: 5, leftValue: 5 },
    { input: "5 - 5", operator: "-", rightValue: 5, leftValue: 5 },
    { input: "5 * 5", operator: "*", rightValue: 5, leftValue: 5 },
    { input: "5 / 5", operator: "/", rightValue: 5, leftValue: 5 },
    { input: "5 > 5", operator: ">", rightValue: 5, leftValue: 5 },
    { input: "5 < 5", operator: "<", rightValue: 5, leftValue: 5 },
    { input: "5 == 5", operator: "==", rightValue: 5, leftValue: 5 },
    { input: "5 != 5", operator: "!=", rightValue: 5, leftValue: 5 },
  ];

  binaryTestCases.forEach(({ input, operator, rightValue, leftValue }) =>
    it(`should parse binary operation ${input}`, () => {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toBeEmpty();
      expect(program.statements).toHaveLength(1);

      const [statement] = program.statements;

      expect(statement).toBeInstanceOf(ExpressionStatement);

      const infixExpression = (statement as ExpressionStatement)
        .expression as InfixExpression;

      expect(infixExpression).toBeInstanceOf(InfixExpression);

      expect(infixExpression.operator).toBe(operator);

      testIntegerLiteral(infixExpression.left, leftValue);
      testIntegerLiteral(infixExpression.right, rightValue);
    })
  );

  const groupedBinaryOperations: [input: string, expected: string][] = [
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
  ];

  groupedBinaryOperations.forEach(([input, expected]) =>
    it(`should parse and group complex binary operations ${input}`, () => {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toBeEmpty();
      expect(`${program}`).toBe(expected);
    })
  );
});

const testIntegerLiteral = (expression: Expression, value: number) => {
  const integerLiteral = expression as IntegerLiteral;

  expect(integerLiteral).toBeInstanceOf(IntegerLiteral);
  expect(integerLiteral.value).toBe(value);
  expect(integerLiteral.tokenLiteral()).toBe(`${value}`);
};
