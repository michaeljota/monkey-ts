import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Lexer } from "::lexer/lexer";
import { TokenType } from "::token";

export async function start() {
  const rl = createInterface({ input, output });

  while (true) {
    const line = await rl.question(">> ");

    if (!line) {
      console.log("Bye!!!");
      break;
    }

    const l = new Lexer(line);
    let token = l.nextToken();

    while (token.type !== TokenType.EOF) {
      console.log(token);
      token = l.nextToken();
    }
  }

  rl.close();
}
