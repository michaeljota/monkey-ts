import { describe, expect, it } from "bun:test";
import { readString, skipWhitespace } from "./helpers";

describe("skipWhitespace", () => {
  it("should skip whitespaces", () => {
    const input = "   i";
    const res = skipWhitespace(input, 0);

    expect(res).toBe(3);

    expect(input[res]).toBe("i");
  });
});

describe("readString", () => {
  it("should", () => {
    const input = '"hello"';
    const [res, pos] = readString(input, 1);

    expect(res).toBe("hello");
    expect(pos).toBe(input.length - 1);
  });
});
