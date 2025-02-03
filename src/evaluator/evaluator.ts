import {
  AstExpressionType,
  AstProgramType,
  AstStatementType,
  IfExpression,
  Program,
  type NodeUnion,
  type StatementUnion,
} from "::ast";
import { Error, Integer, ObjectType, Return, type ObjectUnion } from "::object";
import { FALSE, NULL, TRUE } from "./staticValues";

export const evaluate = (node: NodeUnion): ObjectUnion => {
  switch (node.type) {
    case AstProgramType.Program: {
      return evaluateProgram(node);
    }
    case AstStatementType.Expression: {
      return evaluate(node.expression);
    }
    case AstStatementType.Block: {
      return evaluateBlockStatements(node.statements);
    }
    case AstStatementType.Return: {
      const evaluated = evaluate(node.returnValue);
      if (evaluated instanceof Error) {
        return evaluated;
      }
      return new Return(evaluated);
    }
    case AstExpressionType.Integer: {
      return new Integer(node.value);
    }
    case AstExpressionType.Boolean: {
      return nativeBoolToBooleanObject(node.value);
    }
    case AstExpressionType.Prefix: {
      const right = evaluate(node.right);
      if (right instanceof Error) {
        return right;
      }
      return evaluatePrefixExpression(node.operator, right);
    }
    case AstExpressionType.Infix: {
      const right = evaluate(node.right);
      if (right instanceof Error) {
        return right;
      }
      const left = evaluate(node.left);
      if (left instanceof Error) {
        return left;
      }

      return evaluateInfixExpression(left, node.operator, right);
    }
    case AstExpressionType.If: {
      return evaluateIfExpression(node);
    }
    default: {
      return NULL;
    }
  }
};

const evaluateProgram = (program: Program): ObjectUnion => {
  let result: ObjectUnion = NULL;

  for (const statement of program.statements) {
    result = evaluate(statement);

    if (result instanceof Return) {
      return result.value;
    }
    if (result instanceof Error) {
      return result;
    }
  }

  return result;
};

const evaluateBlockStatements = (statements: StatementUnion[]): ObjectUnion => {
  let result: ObjectUnion = NULL;

  for (const statement of statements) {
    result = evaluate(statement);

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
      return new Integer(leftValue / rightValue);
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

const evaluateIfExpression = (node: IfExpression) => {
  const condition = evaluate(node.condition);
  if (condition instanceof Error) {
    return condition;
  }
  if (condition != NULL && condition != FALSE) {
    return evaluate(node.consequence);
  }
  if (node.alternative) {
    return evaluate(node.alternative);
  }
  return NULL;
};
