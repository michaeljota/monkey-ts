import { describe, expect, it, test } from "bun:test";
import { TokenType, type Token } from "::token";
import { Lexer } from "::lexer/lexer";
import { AstStatementType, LetStatement, Program, type Statement } from "::ast";
import { Parser } from "./parser";

describe("Parser", () => {
  it("should parse the program", () => {
    const input = `
      let x = 5;
      let y = 10;
      let foobar = 838383;
    `;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    let program: Program;

    expect(() => {
      program = parser.parseProgram();
    }).not.toThrow();

    expect(program!.statements).toHaveLength(3);
  });

  it("should parse let statements", () => {
    const input = `
      let x = 5;
      let y = 10;
      let foobar = 838383;
    `;

    const expectedIdentifiers = ["x", "y", "foobar"];

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    program.statements.forEach((statement, i) => {
      const expectedIdentifier = expectedIdentifiers[i];

      expect(statement.tokenLiteral()).toBe("let");
      expect(statement.type).toBe(AstStatementType.Let);
      const letStatement = statement as LetStatement;

      expect(letStatement.name.value).toBe(expectedIdentifier);
      expect(letStatement.name.tokenLiteral()).toBe(expectedIdentifier);
    });
  });

  it("should handle errors for let statements", () => {
    const input = `
      let = 5;
      let y 10;
      let 10;
    `;

    const expectedTokens = ["IDENT", "=", "IDENT"];
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    parser.parseProgram();

    expect(parser.errors).toHaveLength(3);

    parser.errors.forEach((error, i) => {
      const expectedToken = expectedTokens[i];

      expect(error).toContain(`Next token expected to be ${expectedToken},`);
    });
  });
});
