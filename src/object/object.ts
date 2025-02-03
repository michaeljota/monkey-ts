import type { BlockStatement, Identifier } from "::ast";
import { ObjectType, type BaseObject } from "./types";
import type { Environment } from "./environment";

export type ObjectUnion = Integer | Boolean | Null | Return | Error | Function | String;

export class Integer implements BaseObject {
  readonly type = ObjectType.INTEGER;

  constructor(readonly value: number) {}

  toString(): string {
    return `${this.value}`;
  }
}

export class String implements BaseObject {
  readonly type = ObjectType.STRING;

  constructor(readonly value: string) {}

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

export class Return implements BaseObject {
  readonly type = ObjectType.RETURN;

  constructor(readonly value: ObjectUnion) {}

  toString(): string {
    return `${this.value}`;
  }
}

export class Error implements BaseObject {
  readonly type = ObjectType.ERROR;

  constructor(readonly message: string) {}

  toString(): string {
    return `ERROR: ${this.message}`;
  }
}

export class Function implements BaseObject {
  readonly type = ObjectType.FUNCTION;

  constructor(
    readonly params: Identifier[],
    readonly body: BlockStatement,
    readonly env: Environment,
  ) {}

  toString(): string {
    // prettier-ignore
    return (
`fn (${this.params.join(",")}) {
  ${this.body}
}`
    );
  }
}
