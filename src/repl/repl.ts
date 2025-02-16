import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createLexer } from "::lexer/lexer";
import { parseProgram } from "::parser";
import { evaluate } from "::evaluator/evaluator";
import { Environment } from "::object";

export async function start(username: string) {
  const rl = createInterface({ input, output });
  const environment = new Environment();

  console.log(
    `Hello ${username}! This is the Monkey programming language!
Feel free to type in commands!
`,
  );

  while (true) {
    const line = await rl.question(">> ");

    if (!line) {
      rl.write("Bye!!!");
      rl.write("\n");
      break;
    }

    const lexer = createLexer(line);
    const [program, errors] = parseProgram(lexer);

    if (errors) {
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
      console.log(
        `Woops! We ran into some monkey business here!

Parse error: ${errors.join("\n")}`,
      );
      continue;
    }

    const evaluated = evaluate(program, environment);

    if (!evaluated) {
      continue;
    }

    console.log(`${evaluated}
`);
  }

  rl.close();
}
