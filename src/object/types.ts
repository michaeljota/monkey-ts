export enum ObjectType {
  INTEGER = "INTEGER",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  NULL = "NULL",
  RETURN = "RETURN",
  ERROR = "ERROR",
  FUNCTION = "FUNCTION",
  BUILTIN = "BUILTIN",
}

export interface BaseObject {
  type: ObjectType;
}
