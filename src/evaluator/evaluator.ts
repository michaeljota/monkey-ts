import {
  AstExpressionType,
  AstProgramType,
  AstStatementType,
  IfExpression,
  Program,
  type ExpressionUnion,
  type NodeUnion,
  type StatementUnion,
} from "::ast";
import {
  Environment,
  Error,
  Function,
  Integer,
  ObjectType,
  Return,
  type ObjectUnion,
} from "::object";
import { FALSE, NULL, TRUE } from "./staticValues";

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
      const right = evaluate(node.right, environment);
      if (right instanceof Error) {
        return right;
      }
      const left = evaluate(node.left, environment);
      if (left instanceof Error) {
        return left;
      }
      return evaluateInfixExpression(left, node.operator, right);
    }
    case AstExpressionType.If: {
      return evaluateIfExpression(node, environment);
    }
    case AstExpressionType.Identifier: {
      const value = environment.get(node.value);
      if (value == null) {
        return new Error(`Identifier not found: ${node.value}`);
      }
      return value;
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
    default: {
      return NULL;
    }
  }
};

const evaluateProgram = (program: Program, environment: Environment): ObjectUnion => {
  let result: ObjectUnion = NULL;

  for (const statement of program.statements) {
    result = evaluate(statement, environment);

    if (result instanceof Return) {
      return result.value;
    }
    if (result instanceof Error) {
      return result;
    }
  }

  return result;
};

const evaluateBlockStatements = (
  statements: StatementUnion[],
  environment: Environment,
): ObjectUnion => {
  let result: ObjectUnion = NULL;

  for (const statement of statements) {
    result = evaluate(statement, environment);

    if (result instanceof Return || result instanceof Error) {
      return result;
    }
  }

  return result;
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

const evaluateFunction = (fn: ObjectUnion, params: ObjectUnion[]): ObjectUnion => {
  if (!(fn instanceof Function)) {
    return new Error(`Not a function: ${fn}`);
  }
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
};
