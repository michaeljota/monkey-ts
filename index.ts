import os from "os";
import { start } from "::repl";

function main() {
  const userInfo = os.userInfo();

  const username = userInfo.username ?? "Unknown";

  start(username);
}

main();
