import os from "os";
import { start } from "::repl";

function main() {
  const userInfo = os.userInfo();

  const username = userInfo.username ?? "Unknown";

  console.log(`Hello ${username}! This is the Monkey programming language!`);
  console.log("Feel free to type in commands\n");

  start();
}

main();
