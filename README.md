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

This repository contains a TypeScript implementation of the process laid out in the book. Initially, it was using object-oriented programming. Once I got a working version, I decided to experiment further, and rewrote it. First in a more functional style, and then a full‑blown reactive flavour with [Signux](https://michaeljota.github.io/signux/). Again, nothing production‑ready, just experiments that were fun to hack on.

## Branches at a glance

### `main`  – functional take

- **Lexer** → plain JS generator (`for…of lexer()` to get tokens).
- **Parser** → a bunch of pure Pratt helpers that chew the generator.
- **Evaluator** → always was a pure function, so I left it mostly untouched.

### `signux`  – functional + FRP

- Same core but every piece talks through Signux events/stores.
- You still _pull_ tokens, but you can also _react_ to them — perfect for live‑coding UIs.
- The parser exposes both a reactive state and a Promise wrapper (`await parseProgram()`).

---

## Why bother?

Because:

- I wanted an excuse to practise FP/FRP in a tiny codebase.
- Generators keep memory low and make REPL streaming super easy.
- Signux lets me time‑travel debug the interpreter. Although this has not been implemented, the Lexer would allow it easily. Nerdy, but neat.
