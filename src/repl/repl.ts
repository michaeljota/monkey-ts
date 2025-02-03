import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Lexer } from "::lexer/lexer";
import { Parser } from "::parser";
import { evaluate } from "::evaluator/evaluator";
import { Environment } from "::object";

export async function start(username: string) {
  const rl = createInterface({ input, output });
  const environment = new Environment();

  rl.write(`Hello ${username}! This is the Monkey programming language!`);
  rl.write("\n");
  rl.write("Feel free to type in commands\n");
  rl.write("\n");

  while (true) {
    const line = await rl.question(">> ");

    if (!line) {
      rl.write("Bye!!!");
      rl.write("\n");
      break;
    }

    const lexer = new Lexer(line);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    if (parser.errors.length) {
      rl.write(`
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
      rl.write("Woops! We ran into some monkey business here!");
      rl.write("\n");
      rl.write(`Parse error: ${parser.errors.join("\n")}`);
      continue;
    }

    const evaluated = evaluate(program, environment);

    if (!evaluated) {
      continue;
    }

    rl.write(`${evaluated}`);
    rl.write("\n");
  }

  rl.close();
}
