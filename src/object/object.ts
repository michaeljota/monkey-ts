import { ObjectType, type BaseObject } from "./types";

export type ObjectUnion = Integer | Boolean | Null;

export class Integer implements BaseObject {
  readonly type = ObjectType.INTEGER;

  constructor(readonly value: number) {}

  toString(): string {
    return `${this.value}`;
  }
}

export class Boolean implements BaseObject {
  readonly type = ObjectType.BOOLEAN;

  constructor(readonly value: boolean) {}

  toString(): string {
    return `${this.value}`;
  }
}

export class Null implements BaseObject {
  readonly type = ObjectType.NULL;

  toString(): string {
    return "NULL";
  }
}
