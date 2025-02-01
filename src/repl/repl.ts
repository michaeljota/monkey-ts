import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Lexer } from "::lexer/lexer";
import { Parser } from "::parser";
import { evaluate } from "::evaluator/evaluator";

export async function start() {
  const rl = createInterface({ input, output });

  while (true) {
    const line = await rl.question(">> ");

    if (!line) {
      console.log("Bye!!!");
      break;
    }

    const lexer = new Lexer(line);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    if (parser.errors.length) {
      console.log(`
            __,__
   .--.  .-"     "-.  .--.
  / .. \\/  .-. .-.  \\/ .. \\
 | |  '|  /   Y   \\  |'  | |
 | \\   \\  \\ 0 | 0 /  /   / |
  \\ '- ,\\.-"""""""-./, -' /
   ''-' /_   ^ ^   _\\ '-''
       |  \\._   _./  |
       \\   \\ '~' /   /
        '._ '-=-' _.'
           '-----'
`);
      console.log("Woops! We ran into some monkey business here!");
      console.log("Parse error:", parser.errors.join("\n"));
      continue;
    }

    const evaluated = evaluate(program);

    if (!evaluated) {
      continue;
    }

    console.log(`${evaluated}`);
  }

  rl.close();
}
