import { Array, Builtin, Error, Integer, ObjectType } from "::object";
import { NULL } from "./staticValues";

export const Builtins: Readonly<Record<string, Builtin>> = {
  len: new Builtin((...params) => {
    if (params.length > 1) {
      return new Error(`Wrong number of arguments. Expected: 1. Got: ${params.length}`);
    }
    const [param] = params;
    if (param.type === ObjectType.STRING) {
      return new Integer(param.value.length);
    }
    if (param.type === ObjectType.ARRAY) {
      return new Integer(param.elements.length);
    }

    return new Error(`Unexpected type passed to "len" builtin. Called with: ${param.type}`);
  }),
  head: new Builtin((...params) => {
    if (params.length > 1) {
      return new Error(`Wrong number of arguments. Expected: 1. Got: ${params.length}`);
    }
    const [param] = params;
    if (param.type !== ObjectType.ARRAY) {
      return new Error(`Unexpected type passed to "head" builtin. Called with: ${param.type}`);
    }

    const head = param.elements.at(0);

    return head ?? NULL;
  }),
  last: new Builtin((...params) => {
    if (params.length > 1) {
      return new Error(`Wrong number of arguments. Expected: 1. Got: ${params.length}`);
    }
    const [param] = params;
    if (param.type !== ObjectType.ARRAY) {
      return new Error(`Unexpected type passed to "last" builtin. Called with: ${param.type}`);
    }

    const last = param.elements.at(-1);

    return last ?? NULL;
  }),
  tail: new Builtin((...params) => {
    if (params.length > 1) {
      return new Error(`Wrong number of arguments. Expected: 1. Got: ${params.length}`);
    }
    const [param] = params;
    if (param.type !== ObjectType.ARRAY) {
      return new Error(`Unexpected type passed to "tail" builtin. Called with: ${param.type}`);
    }

    const [, ...tail] = param.elements;

    return new Array(tail);
  }),
  init: new Builtin((...params) => {
    if (params.length > 1) {
      return new Error(`Wrong number of arguments. Expected: 1. Got: ${params.length}`);
    }
    const [param] = params;
    if (param.type !== ObjectType.ARRAY) {
      return new Error(`Unexpected type passed to "init" builtin. Called with: ${param.type}`);
    }

    const init = param.elements.slice(0, param.elements.length - 1);

    return new Array(init);
  }),
  push: new Builtin((...params) => {
    if (params.length !== 2) {
      return new Error(`Wrong number of arguments. Expected: 2. Got: ${params.length}`);
    }
    const [array, newEl] = params;
    if (array.type !== ObjectType.ARRAY) {
      return new Error(`Unexpected type passed to "push" builtin. Called with: ${array.type}`);
    }

    return new Array([...array.elements, newEl]);
  }),
  prepend: new Builtin((...params) => {
    if (params.length !== 2) {
      return new Error(`Wrong number of arguments. Expected: 2. Got: ${params.length}`);
    }
    const [array, newEl] = params;
    if (array.type !== ObjectType.ARRAY) {
      return new Error(`Unexpected type passed to "push" builtin. Called with: ${array.type}`);
    }

    return new Array([newEl, ...array.elements]);
  }),
};
