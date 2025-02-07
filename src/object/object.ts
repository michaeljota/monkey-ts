import type { BlockStatement, Identifier } from "::ast";
import { ObjectType, type BaseObject } from "./types";
import type { Environment } from "./environment";

export type ObjectUnion =
  | Integer
  | Boolean
  | Null
  | Return
  | Error
  | Function
  | String
  | Builtin
  | Array
  | Hash;

export type BuiltinFunction = (...params: ObjectUnion[]) => ObjectUnion;

export type HashKey = number | string | boolean;

export interface Hashable {
  hashKey: HashKey;
}

export class Integer implements BaseObject, Hashable {
  readonly type = ObjectType.INTEGER;

  constructor(readonly value: number) {}

  toString(): string {
    return `${this.value}`;
  }

  get hashKey(): HashKey {
    return this.value;
  }
}

export class String implements BaseObject, Hashable {
  readonly type = ObjectType.STRING;

  constructor(readonly value: string) {}

  toString(): string {
    return `${this.value}`;
  }

  get hashKey(): HashKey {
    return this.value;
  }
}

export class Boolean implements BaseObject, Hashable {
  readonly type = ObjectType.BOOLEAN;

  constructor(readonly value: boolean) {}

  toString(): string {
    return `${this.value}`;
  }

  get hashKey(): HashKey {
    return this.value;
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

export class Builtin implements BaseObject {
  readonly type = ObjectType.BUILTIN;

  constructor(readonly fn: BuiltinFunction) {}

  toString(): string {
    return "[builtin function]";
  }
}

export class Array implements BaseObject {
  readonly type = ObjectType.ARRAY;

  constructor(readonly elements: ObjectUnion[]) {}

  toString(): string {
    return `[${this.elements.join(",")}]`;
  }
}

export class Hash implements BaseObject {
  readonly type = ObjectType.HASH;

  constructor(readonly pairs: Map<HashKey, ObjectUnion>) {}

  toString(): string {
    return `{ ${[...this.pairs.entries().map(([key, value]) => `${key} = ${value}`)].join(", ")} }`;
  }
}
