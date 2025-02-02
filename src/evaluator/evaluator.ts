import {
  AstExpressionType,
  AstProgramType,
  AstStatementType,
  IfExpression,
  type NodeUnion,
  type StatementUnion,
} from "::ast";
import { Integer, ObjectType, type ObjectUnion } from "::object";
import { FALSE, NULL, TRUE } from "./staticValues";

export const evaluate = (node: NodeUnion): ObjectUnion => {
  switch (node.type) {
    case AstProgramType.Program: {
      return evaluateStatements(node.statements);
    }
    case AstStatementType.Expression: {
      return evaluate(node.expression);
    }
    case AstStatementType.Block: {
      return evaluateStatements(node.statements);
    }
    case AstExpressionType.Integer: {
      return new Integer(node.value);
    }
    case AstExpressionType.Boolean: {
      return nativeBoolToBooleanObject(node.value);
    }
    case AstExpressionType.Prefix: {
      const right = evaluate(node.right);

      return evaluatePrefixExpression(node.operator, right);
    }
    case AstExpressionType.Infix: {
      const right = evaluate(node.right);
      const left = evaluate(node.left);

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

const evaluateStatements = (statements: StatementUnion[]): ObjectUnion => {
  let result: ObjectUnion = NULL;

  statements.forEach((statement) => {
    result = evaluate(statement);
  });

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
      return NULL;
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
    return NULL;
  }

  return new Integer(-right.value);
};

const evaluateInfixExpression = (
  left: ObjectUnion,
  operator: string,
  right: ObjectUnion,
): ObjectUnion => {
  if (left.type === ObjectType.INTEGER && right.type === ObjectType.INTEGER) {
    return evaluateIntegerInfixExpression(left, operator, right);
  }
  if (operator === "==") {
    return nativeBoolToBooleanObject(left == right);
  }
  if (operator === "!=") {
    return nativeBoolToBooleanObject(left != right);
  }

  return NULL;
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
      return NULL;
  }
};

const evaluateIfExpression = (node: IfExpression) => {
  const condition = evaluate(node.condition);
  if (condition != NULL && condition != FALSE) {
    return evaluate(node.consequence);
  }
  if (node.alternative) {
    return evaluate(node.alternative);
  }
  return NULL;
};
