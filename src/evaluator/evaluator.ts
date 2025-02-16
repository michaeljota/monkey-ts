import { event, state } from "signux";
import {
  AstExpressionType,
  AstProgramType,
  AstStatementType,
  HashLiteral,
  Identifier,
  IfExpression,
  Program,
  type ExpressionUnion,
  type NodeUnion,
  type StatementUnion,
} from "::ast";
import {
  Array,
  Builtin,
  Environment,
  Error,
  Function,
  Hash,
  Integer,
  ObjectType,
  Return,
  String,
  type HashKey,
  type ObjectUnion,
} from "::object";
import { FALSE, NULL, TRUE } from "./staticValues";
import { Builtins } from "./buildins";

export const evaluate = (node: NodeUnion, environment: Environment): ObjectUnion => {
  switch (node.type) {
    case AstProgramType.Program: {
      return evaluateProgram(node, environment);
    }
    case AstStatementType.Expression: {
      return evaluate(node.expression, environment);
    }
    case AstStatementType.Block: {
      return evaluateBlockStatements(node.statements, environment);
    }
    case AstStatementType.Return: {
      const evaluated = evaluate(node.returnValue, environment);
      if (evaluated instanceof Error) {
        return evaluated;
      }
      return new Return(evaluated);
    }
    case AstStatementType.Let: {
      const value = evaluate(node.value, environment);
      if (value instanceof Error) {
        return value;
      }
      environment.set(node.name.value, value);
      return NULL;
    }
    case AstExpressionType.Integer: {
      return new Integer(node.value);
    }
    case AstExpressionType.String: {
      return new String(node.value);
    }
    case AstExpressionType.Array: {
      const elements = evaluateExpressions(node.elements, environment);
      if (elements instanceof Error) {
        return elements;
      }
      return new Array(elements);
    }
    case AstExpressionType.Hash: {
      return evaluateHashLiteral(node, environment);
    }
    case AstExpressionType.Boolean: {
      return nativeBoolToBooleanObject(node.value);
    }
    case AstExpressionType.Prefix: {
      const right = evaluate(node.right, environment);
      if (right instanceof Error) {
        return right;
      }
      return evaluatePrefixExpression(node.operator, right);
    }
    case AstExpressionType.Infix: {
      const left = evaluate(node.left, environment);
      if (left instanceof Error) {
        return left;
      }
      const right = evaluate(node.right, environment);
      if (right instanceof Error) {
        return right;
      }
      return evaluateInfixExpression(left, node.operator, right);
    }
    case AstExpressionType.If: {
      return evaluateIfExpression(node, environment);
    }
    case AstExpressionType.Identifier: {
      return evaluateIdentifier(node, environment);
    }
    case AstExpressionType.Function: {
      return new Function(node.parameters, node.body, environment);
    }
    case AstExpressionType.Call: {
      const value = evaluate(node.functionIdentifier, environment);
      if (value instanceof Error) {
        return value;
      }
      const params = evaluateExpressions(node.functionArguments, environment);
      if (params instanceof Error) {
        return params;
      }

      return evaluateFunction(value, params);
    }
    case AstExpressionType.Index: {
      const left = evaluate(node.left, environment);
      if (left instanceof Error) {
        return left;
      }
      const index = evaluate(node.index, environment);
      if (index instanceof Error) {
        return index;
      }
      return evaluateIndexExpression(left, index);
    }
    default: {
      return NULL;
    }
  }
};

const evaluateProgram = (program: Program, environment: Environment): ObjectUnion => {
  const updateResult = event<ObjectUnion>();
  const $result = state<ObjectUnion>(NULL)
    .on(updateResult, (_, result) => result)
    .create();
  for (const statement of program.statements) {
    const result = evaluate(statement, environment);

    if (result instanceof Return) {
      return result.value;
    }
    if (result instanceof Error) {
      return result;
    }

    updateResult(result);
  }

  return $result();
};

const evaluateBlockStatements = (
  statements: StatementUnion[],
  environment: Environment,
): ObjectUnion => {
  const updateResult = event<ObjectUnion>();
  const $result = state<ObjectUnion>(NULL)
    .on(updateResult, (_, result) => result)
    .create();
  for (const statement of statements) {
    const result = evaluate(statement, environment);

    if (result instanceof Return || result instanceof Error) {
      return result;
    }

    updateResult(result);
  }

  return $result();
};

const nativeBoolToBooleanObject = (input: boolean) => (input ? TRUE : FALSE);

const evaluatePrefixExpression = (operator: string, right: ObjectUnion): ObjectUnion => {
  switch (operator) {
    case "!": {
      return evaluateBangOperator(right);
    }
    case "-": {
      return evaluateMinusPrefixOperator(right);
    }
    default:
      return new Error(`Unknown operator: ${operator}${right.type}`);
  }
};

const evaluateBangOperator = (right: ObjectUnion): ObjectUnion => {
  switch (right) {
    case TRUE: {
      return FALSE;
    }
    case FALSE: {
      return TRUE;
    }
    case NULL: {
      return TRUE;
    }
    default: {
      return FALSE;
    }
  }
};

const evaluateMinusPrefixOperator = (right: ObjectUnion): ObjectUnion => {
  if (right.type !== ObjectType.INTEGER) {
    return new Error(`Unknown operator: -${right.type}`);
  }

  return new Integer(-right.value);
};

const evaluateInfixExpression = (
  left: ObjectUnion,
  operator: string,
  right: ObjectUnion,
): ObjectUnion => {
  if (left.type !== right.type) {
    return new Error(`Unexpected type on operation: ${left.type} ${operator} ${right.type}`);
  }
  if (left.type === ObjectType.INTEGER && right.type === ObjectType.INTEGER) {
    return evaluateIntegerInfixExpression(left, operator, right);
  }
  if (left.type === ObjectType.STRING && right.type === ObjectType.STRING) {
    return evaluateStringInfixExpression(left, operator, right);
  }
  if (operator === "==") {
    return nativeBoolToBooleanObject(left == right);
  }
  if (operator === "!=") {
    return nativeBoolToBooleanObject(left != right);
  }

  return new Error(`Unknown operator: ${left.type} ${operator} ${right.type}`);
};

const evaluateIntegerInfixExpression = (
  left: Integer,
  operator: string,
  right: Integer,
): ObjectUnion => {
  const leftValue = left.value;
  const rightValue = right.value;
  switch (operator) {
    case "+": {
      return new Integer(leftValue + rightValue);
    }
    case "-": {
      return new Integer(leftValue - rightValue);
    }
    case "*": {
      return new Integer(leftValue * rightValue);
    }
    case "/": {
      return new Integer(Math.floor(leftValue / rightValue));
    }

    case "<": {
      return nativeBoolToBooleanObject(leftValue < rightValue);
    }
    case ">": {
      return nativeBoolToBooleanObject(leftValue > rightValue);
    }
    case "==": {
      return nativeBoolToBooleanObject(leftValue == rightValue);
    }
    case "!=": {
      return nativeBoolToBooleanObject(leftValue != rightValue);
    }

    default:
      return new Error(`Unknown operator: ${left.type} ${operator} ${right.type}`);
  }
};

const evaluateStringInfixExpression = (
  left: String,
  operator: string,
  right: String,
): ObjectUnion => {
  if (operator !== "+") {
    return new Error(`Unknown operator: ${left.type} ${operator} ${right.type}`);
  }
  return new String(`${left.value}${right.value}`);
};

const evaluateIfExpression = (node: IfExpression, environment: Environment) => {
  const condition = evaluate(node.condition, environment);
  if (condition instanceof Error) {
    return condition;
  }
  if (condition != NULL && condition != FALSE) {
    return evaluate(node.consequence, environment);
  }
  if (node.alternative) {
    return evaluate(node.alternative, environment);
  }
  return NULL;
};

const evaluateIdentifier = (node: Identifier, environment: Environment) => {
  const value = environment.get(node.value);
  if (value != null) {
    return value;
  }
  const builtin = Builtins[node.value];
  if (builtin != null) {
    return builtin;
  }
  return new Error(`Identifier not found: ${node.value}`);
};

const evaluateExpressions = (
  expressions: ExpressionUnion[],
  environment: Environment,
): Error | ObjectUnion[] => {
  const res: ObjectUnion[] = [];
  for (const exp of expressions) {
    const value = evaluate(exp, environment);
    if (value instanceof Error) {
      return value;
    }
    res.push(value);
  }
  return res;
};

const evaluateHashLiteral = (hash: HashLiteral, environment: Environment): ObjectUnion => {
  const pairs = new Map<HashKey, ObjectUnion>();

  for (const [keyNode, valueNode] of hash.pairs) {
    const key = evaluate(keyNode, environment);
    if (key instanceof Error) {
      return key;
    }

    if (!("hashKey" in key)) {
      return new Error(`Unusable hash key: ${key.type}`);
    }

    const value = evaluate(valueNode, environment);
    if (value instanceof Error) {
      return value;
    }

    pairs.set(key.hashKey, value);
  }

  return new Hash(pairs);
};

const evaluateFunction = (fn: ObjectUnion, params: ObjectUnion[]): ObjectUnion => {
  if (fn instanceof Function) {
    const initialStore = fn.params.reduce(
      (store: Record<string, ObjectUnion>, { value }, i) => ({ ...store, [value]: params[i] }),
      {},
    );
    const env = new Environment(initialStore, fn.env);
    const evaluated = evaluate(fn.body, env);

    if (evaluated instanceof Return) {
      return evaluated.value;
    }

    return evaluated;
  }

  if (fn instanceof Builtin) {
    return fn.fn(...params);
  }

  return new Error(`Not a function: ${fn}`);
};

const evaluateIndexExpression = (left: ObjectUnion, index: ObjectUnion): ObjectUnion => {
  switch (left.type) {
    case ObjectType.ARRAY: {
      return evaluateArrayIndexExpression(left, index);
    }

    case ObjectType.HASH: {
      return evaluateHashIndexExpression(left, index);
    }
    default:
      return new Error(`Index operator not supported: ${left.type}`);
  }
};

const evaluateArrayIndexExpression = (left: Array, index: ObjectUnion): ObjectUnion => {
  if (index.type !== ObjectType.INTEGER) {
    return new Error(`Invalid index: ${index.type}`);
  }

  const element = left.elements.at(index.value);
  if (!element) {
    return new Error(
      `Index access out of bounds. Index: ${index.value}. Array len: ${left.elements.length}`,
    );
  }
  return element;
};

const evaluateHashIndexExpression = (left: Hash, index: ObjectUnion): ObjectUnion => {
  if (!("hashKey" in index)) {
    return new Error(`Unusable hash key: ${index.type}`);
  }

  const value = left.pairs.get(index.hashKey);

  if (!value) {
    return NULL;
  }

  return value;
};
