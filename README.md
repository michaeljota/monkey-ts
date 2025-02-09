# Monkey.ts

A Monkey Interpreter made in Typescript and Bun.

Install dependencies

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To test:

```bash
bun test
```

## About Monkey

Monkey is the programming language described in the book _Writing an Interpreter in Go_. You might call it an educational programming language, so production-ready interpreters aren’t typically expected—and this one is no exception. However, thanks to Bun, it does come with a few nice features:

- It can run directly without transpiling to JavaScript.
- It can create a standalone REPL executable.

## About Monkey.ts

This repository contains a TypeScript implementation of the process laid out in the book. Initially, the approach was heavily object-oriented, but once I got a working interpreter, I decided to experiment further.

The latest version on the `main` branch is no longer the initial OOP-based implementation. Instead, it has been refactored to emphasize functional programming. For instance, the lexer has been converted into a generator function rather than a class, and the evaluator has always been a pure function. Only the parser still remains as a class.

There is also an `effector` branch, which embraces functional and reactive programming using the [Effector](https://effector.dev/) library. In that branch, the lexer has been fully ported to Effector, and the parser port is in progress.

All of these changes are part of my ongoing experiments and an opportunity to apply my knowledge of TypeScript and JavaScript.
