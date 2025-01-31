export enum ObjectType {
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  NULL = "NULL",
}

export interface BaseObject {
  type: ObjectType;
}
