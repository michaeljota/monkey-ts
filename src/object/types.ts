export enum ObjectType {
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  NULL = "NULL",
  RETURN = "RETURN",
}

export interface BaseObject {
  type: ObjectType;
}
