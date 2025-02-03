import type { ObjectUnion } from "./object";

export class Environment {
  constructor(
    private readonly store: Record<string, ObjectUnion> = {},
    private readonly outer?: Maybe<Environment>,
  ) {}

  get(name: string): Maybe<ObjectUnion> {
    return name in this.store ? this.store[name] : this.outer?.get(name);
  }

  set(name: string, value: ObjectUnion) {
    this.store[name] = value;
  }
}
