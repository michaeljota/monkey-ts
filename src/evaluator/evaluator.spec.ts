import { describe, expect, it } from "bun:test";

import { Lexer } from "::lexer/lexer";
import { Parser } from "::parser";
import {
  Array,
  Boolean,
  Environment,
  Error,
  Function,
  Hash,
  Integer,
  String,
  type BaseObject,
  type HashKey,
} from "::object";

import { evaluate } from "./evaluator";
import { NULL } from "./staticValues";

const setupEvaluator = (input: string): BaseObject => {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer);
  const program = parser.parseProgram();
  const environment = new Environment();
  return evaluate(program, environment);
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

  const stringTestCases: [input: string, expected: string][] = [
    ['"Hello world!"', "Hello world!"],
    [`"Hello" + " " + "world!"`, "Hello world!"],
    [
      `let hello = "Hello";
      let world = "world!";
      hello + " " + world;
      `,
      "Hello world!",
    ],
  ];

  stringTestCases.forEach(([input, expected]) => {
    it(`should evaluate string input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      expect(evaluated).toBeInstanceOf(String);
      expect((evaluated as String).value).toBe(expected);
    });
  });

  const arrayTestCases: [input: string, expected: number[]][] = [["[1, 2 * 2, 3 + 3]", [1, 4, 6]]];

  arrayTestCases.forEach(([input, expected]) => {
    it(`should evaluate array input (${input}) to ${expected.join()}`, () => {
      const evaluated = setupEvaluator(input);

      expect(evaluated).toBeInstanceOf(Array);
      const evaluatedArray = evaluated as Array;

      evaluatedArray.elements.forEach((value, i) => {
        testIntegerObject(value, expected[i]);
      });
    });
  });

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

  const ifExpressionTestCases: [input: string, expected: number | undefined][] = [
    ["if (true) { 10 }", 10],
    ["if (false) { 10 }", undefined],
    ["if (1) { 10 }", 10],
    ["if (1 < 2) { 10 }", 10],
    ["if (1 > 2) { 10 }", undefined],
    ["if (1 > 2) { 10 } else { 20 }", 20],
    ["if (1 < 2) { 10 } else { 20 }", 10],
  ];

  ifExpressionTestCases.forEach(([input, expected]) =>
    it(`should evaluate if expression input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      if (expected) {
        testIntegerObject(evaluated, expected);
        return;
      }
      testNullObject(evaluated);
    }),
  );

  const returnStatementTestCases: [input: string, expected: number][] = [
    ["return 10;", 10],
    ["return 10; 9;", 10],
    ["return 2 * 5; 9;", 10],
    ["9; return 2 * 5; 9;", 10],
    ["if (10 > 1) { if (10 > 1) { return 10; } return 1; }", 10],
  ];

  returnStatementTestCases.forEach(([input, expected]) =>
    it(`should evaluate return statement input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      testIntegerObject(evaluated, expected);
    }),
  );

  const errorTestCases: [input: string, expectedMessage: string][] = [
    ["5 + true;", "Unexpected type on operation: INTEGER + BOOLEAN"],
    ["5 + true; 5;", "Unexpected type on operation: INTEGER + BOOLEAN"],
    ["-true", "Unknown operator: -BOOLEAN"],
    ["true + false;", "Unknown operator: BOOLEAN + BOOLEAN"],
    ["5; true + false; 5", "Unknown operator: BOOLEAN + BOOLEAN"],
    ["if (10 > 1) { true + false; }", "Unknown operator: BOOLEAN + BOOLEAN"],
    [
      `if (10 > 1) { if (10 > 1) { return true + false; } return 1; }`,
      "Unknown operator: BOOLEAN + BOOLEAN",
    ],
    ["foobar", "Identifier not found: foobar"],
    ['"Hello" - "world"', "Unknown operator: STRING - STRING"],
    [`{"name": "Monkey"}[fn(x) { x }];`, "Unusable hash key: FUNCTION"],
  ];

  errorTestCases.forEach(([input, expected]) =>
    it(`should evaluate return statement input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      expect(evaluated).toBeInstanceOf(Error);
      expect((evaluated as Error).message).toBe(expected);
    }),
  );

  const letStatementsTestCases: [input: string, expected: number][] = [
    ["let a = 5; a;", 5],
    ["let a = 5 * 5; a;", 25],
    ["let a = 5; let b = a; b;", 5],
    ["let a = 5; let b = a; let c = a + b + 5; c;", 15],
  ];

  letStatementsTestCases.forEach(([input, expected]) =>
    it(`should evaluate return statement input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      testIntegerObject(evaluated, expected);
    }),
  );

  const functionTestCases: [input: string, expectedParams: string[], expectedBody: string][] = [
    ["fn(x) { x + 2 }", ["x"], "(x + 2)"],
    ["fn(x, y) { x + y }", ["x", "y"], "(x + y)"],
  ];

  functionTestCases.forEach(([input, expectedParams, expectedBody]) =>
    it(`should evaluate function input (${input}) to params: ${expectedParams}, and body: ${expectedBody}`, () => {
      const evaluated = setupEvaluator(input);

      expect(evaluated).toBeInstanceOf(Function);
      const functionEval = evaluated as Function;
      expect(functionEval.params).toHaveLength(expectedParams.length);
      expect(`${functionEval.params.join(",")}`).toBe(expectedParams.join(","));
      expect(`${functionEval.body}`).toBe(expectedBody);
    }),
  );

  const functionApplicationTestCases: [input: string, expected: number][] = [
    ["let identity = fn(x) { x; }; identity(5);", 5],
    ["let identity = fn(x) { return x; }; identity(5);", 5],
    ["let double = fn(x) { x * 2; }; double(5);", 10],
    ["let add = fn(x, y) { x + y; }; add(5, 5);", 10],
    ["let add = fn(x, y) { x + y; }; add(5 + 5, add(5, 5));", 20],
    ["fn(x) { x; }(5)", 5],
    [
      `
let newAdder = fn(x) {
fn(y) { x + y };
};
let addTwo = newAdder(2);
addTwo(2);`,
      4,
    ],
  ];

  functionApplicationTestCases.forEach(([input, expected]) =>
    it(`should evaluate function input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      testIntegerObject(evaluated, expected);
    }),
  );

  const builtinFunctionTestCases: [input: string, expected: unknown][] = [
    [`len("")`, 0],
    [`len("four")`, 4],
    [`len("hello world")`, 11],
    [`len(1)`, 'Unexpected type passed to "len" builtin. Called with: INTEGER'],
    [`len("one", "two")`, "Wrong number of arguments. Expected: 1. Got: 2"],
  ];

  builtinFunctionTestCases.forEach(([input, expected]) =>
    it(`should call builtin function: input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      switch (typeof expected) {
        case "number":
          testIntegerObject(evaluated, expected);
          return;

        case "string": {
          expect(evaluated).toBeInstanceOf(Error);
          expect((evaluated as Error).message).toBe(expected);
          return;
        }
        default:
          break;
      }
    }),
  );

  const arrayIndexTestCases: [input: string, expected: number | string][] = [
    ["[1, 2, 3][0]", 1],
    ["[1, 2, 3][1]", 2],
    ["[1, 2, 3][2]", 3],
    ["let i = 0; [1][i];", 1],
    ["[1, 2, 3][1 + 1];", 3],
    ["let myArray = [1, 2, 3]; myArray[2];", 3],
    ["let myArray = [1, 2, 3]; myArray[0] + myArray[1] + myArray[2];", 6],
    ["let myArray = [1, 2, 3]; let i = myArray[0]; myArray[i]", 2],
    ["[1, 2, 3][3]", "Index access out of bounds. Index: 3. Array len: 3"],
    ["[1, 2, 3][-4]", "Index access out of bounds. Index: -4. Array len: 3"],
    ["[1, 2, 3][-1]", 3],
  ];

  arrayIndexTestCases.forEach(([input, expected]) =>
    it(`should evaluate array by index with input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      switch (typeof expected) {
        case "number":
          testIntegerObject(evaluated, expected);
          return;

        case "string": {
          expect(evaluated).toBeInstanceOf(Error);
          expect((evaluated as Error).message).toBe(expected);
          return;
        }
        default:
          break;
      }
    }),
  );

  const arrayBuiltinTestCases: [input: string, expected: number[]][] = [
    [
      `
    let map = fn(arr, f) {
      let iter = fn(arr, accumulated) {
        if (len(arr) == 0) {
          accumulated
        } else {
          iter(tail(arr), push(accumulated, f(head(arr))));
        }
      };
      iter(arr, []);
    };

    let a = [1, 2, 3, 4];
    let double = fn(x) { x * 2 };

    map(a, double);
    `,
      [2, 4, 6, 8],
    ],
  ];

  arrayBuiltinTestCases.forEach(([input, expected], i) =>
    it(`should run builtin array functions (${i})`, () => {
      const evaluated = setupEvaluator(input);

      expect(evaluated).toBeInstanceOf(Array);
      const evaluatedArray = evaluated as Array;

      evaluatedArray.elements.forEach((value, i) => {
        testIntegerObject(value, expected[i]);
      });
    }),
  );

  it("should parse hash", () => {
    const input = `let two = "two";
    {
        "one": 10 - 9,
        two: 1 + 1,
        "thr" + "ee": 6 / 2,
        4: 4,
        true: 5,
        false: 6
    }`;

    const expected = new Map<HashKey, number>([
      ["one", 1],
      ["two", 2],
      ["three", 3],
      [4, 4],
      [true, 5],
      [false, 6],
    ]);

    const evaluated = setupEvaluator(input);

    expect(evaluated).toBeInstanceOf(Hash);
    const evaluatedHash = evaluated as Hash;

    expect(evaluatedHash.pairs.size).toBe(6);
    evaluatedHash.pairs.entries().forEach(([key, value]) => {
      const expectedValue = expected.get(key);

      expect(expectedValue).toBeDefined();

      testIntegerObject(value, expectedValue!);
    });
  });

  const hashIndexTestCases: [string, Maybe<number>][] = [
    [`{"foo": 5}["foo"]`, 5],
    [`let key = "foo";{"foo": 5}[key]`, 5],
    [`{5: 5}[5]`, 5],
    [`{true: 5}[true]`, 5],
    [`{false: 5}[false]`, 5],
    [`{}["foo"]`, undefined],
    [`{"foo": 5}["bar"]`, undefined],
  ];

  hashIndexTestCases.forEach(([input, expected]) =>
    it.only(`should evaluate hash by index with input (${input}) to ${expected}`, () => {
      const evaluated = setupEvaluator(input);

      switch (typeof expected) {
        case "number":
          testIntegerObject(evaluated, expected);
          return;

        case "undefined": {
          expect(evaluated).toBe(NULL);
          return;
        }
        default:
          break;
      }
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

const testNullObject = (evaluated: BaseObject): void => {
  expect(evaluated).toBe(NULL);
};
