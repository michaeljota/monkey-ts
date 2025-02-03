import type { ObjectUnion } from "./object";

export class Environment {
  readonly store: Record<string, ObjectUnion> = {};

  get(name: string): Maybe<ObjectUnion> {
    return this.store[name];
  }

  set(name: string, value: ObjectUnion) {
    this.store[name] = value;
  }
}
