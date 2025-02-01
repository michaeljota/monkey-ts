import { describe, expect, it } from "bun:test";

import { Lexer } from "::lexer/lexer";
import { Parser } from "::parser";
import { Boolean, Integer, type BaseObject } from "::object";

import { evaluate } from "./evaluator";

const setupEvaluator = (input: string): BaseObject => {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer);
  const program = parser.parseProgram();
  return evaluate(program);
};

describe("Evaluator", () => {
  const integerTestCases: [input: string, expected: number][] = [
    ["5", 5],
    ["10", 10],
    ["-5", -5],
    ["-10", -10],
    ["5 + 5 + 5 + 5 - 10", 10],
    ["2 * 2 * 2 * 2 * 2", 32],
    ["-50 + 100 + -50", 0],
    ["5 * 2 + 10", 20],
    ["5 + 2 * 10", 25],
    ["20 + 2 * -10", 0],
    ["50 / 2 * 2 + 10", 60],
    ["2 * (5 + 10)", 30],
    ["3 * 3 * 3 + 10", 37],
    ["3 * 3 * (3 + 10)", 117],
    ["(5 + 10 * 2 + 15 / 3) * 2 + -10", 50],
  ];

  integerTestCases.forEach(([input, expected]) =>
    it(`should evaluate integer input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      testIntegerObject(evaluated, expected);
    }),
  );

  const booleanTestCases: [input: string, expected: boolean][] = [
    ["true", true],
    ["false", false],
    ["1 < 2", true],
    ["1 > 2", false],
    ["1 < 1", false],
    ["1 > 1", false],
    ["1 == 1", true],
    ["1 != 1", false],
    ["1 == 2", false],
    ["1 != 2", true],
    ["true == true", true],
    ["false == false", true],
    ["true == false", false],
    ["true != false", true],
    ["false != true", true],
    ["(1 < 2) == true", true],
    ["(1 < 2) == false", false],
    ["(1 > 2) == true", false],
    ["(1 > 2) == false", true],
  ];

  booleanTestCases.forEach(([input, expected]) =>
    it(`should evaluate boolean input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      testBooleanObject(evaluated, expected);
    }),
  );

  const bangOperatorTestCases: [input: string, expected: boolean][] = [
    ["!true", false],
    ["!false", true],
    ["!5", false],
    ["!!true", true],
    ["!!false", false],
    ["!!5", true],
    ["!!0", true],
  ];

  bangOperatorTestCases.forEach(([input, expected]) =>
    it(`should evaluate bang operation input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      testBooleanObject(evaluated, expected);
    }),
  );
});

const testIntegerObject = (evaluated: BaseObject, expected: number): void => {
  expect(evaluated).toBeInstanceOf(Integer);
  expect((evaluated as Integer).value).toBe(expected);
};

const testBooleanObject = (evaluated: BaseObject, expected: boolean): void => {
  expect(evaluated).toBeInstanceOf(Boolean);
  expect((evaluated as Boolean).value).toBe(expected);
};
