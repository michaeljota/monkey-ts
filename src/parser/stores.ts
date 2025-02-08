import { createStore, createEvent, sample } from "effector";
import type { Token } from "::token";
import { TokenType } from "::token";

export const initParser = createEvent();
export const pushError = createEvent<string>();

export const $errors = createStore<readonly string[]>([])
  .on(initParser, () => [])
  .on(pushError, (errors, newError) => [...errors, newError]);

export const EOF_TOKEN: Token = { type: TokenType.EOF, literal: "" };

/**
 * Stores "atómicos":
 * - $currentToken: token “actual”
 * - $nextToken: token “en espera”
 */
export const $currentToken = createStore<Token>(EOF_TOKEN);
export const $nextToken = createStore<Token>(EOF_TOKEN);

/**
 * También necesitas un lugar donde guardes la referencia del lexer,
 * para poder hacer "lexer.nextToken()" al avanzar.
 */
// export const $parserLexer = createStore<Lexer | null>(null);

/** Evento para avanzar un token, lo que en la clase era "this.nextToken()" */
export const advanceToken = createEvent();

/**
 * Manejar la inicialización:
 * - Guarda el lexer en $parserLexer
 * - Llama 2 veces a "lexer.nextToken()" para setear current y next
 */
const $res = sample({
  clock: initParser,
  fn: (lexer) => ({
    lexer,
    // current: lexer.nextToken(), // 1ª llamada
    // next: lexer.nextToken(), // 2ª llamada
  }),
});

// sample({
//   clock: $res.map(({ lexer }) => lexer),
//   // target: $parserLexer,
// });

// sample({
//   // clock: $res.map(({ current }) => current),
//   // target: $currentToken,
// });

// sample({
//   clock: $res.map(({ next }) => next),
//   target: $nextToken,
// });

/**
 * Manejar "advanceToken":
 * - Pone $currentToken = $nextToken
 * - Pone $nextToken = lexer.nextToken()
 */
// sample({
//   clock: advanceToken,
//   source: {
//     lexer: $parserLexer,
//     current: $nextToken, // valor actual de $nextToken
//   },
//   fn: ({ lexer, current }) => {
//     if (!lexer) {
//       // Sin lexer, no podemos avanzar. Retornamos lo que tenemos.
//       return;
//     }
//     // Consumir un nuevo token del lexer
//     const next = lexer.nextToken();

//     return {
//       current,
//       next,
//     };
//   },
//   // target: [
//   //   { store: $currentToken, field: "current" },
//   //   { store: $nextToken, field: "next" },
//   // ],
// });
