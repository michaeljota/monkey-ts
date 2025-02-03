export enum ObjectType {
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  NULL = "NULL",
  RETURN = "RETURN",
  ERROR = "ERROR",
  FUNCTION = "FUNCTION",
}

export interface BaseObject {
  type: ObjectType;
}
