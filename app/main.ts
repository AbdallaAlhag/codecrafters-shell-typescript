import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  // terminal: true,
});

function main() {
  const types: string[] = ["echo", "type", "exit"];
  rl.question("$ ", (answer: string) => {
    if (answer === "exit 0") {
      rl.close();
      return;
    }
    if (answer.startsWith("echo ") === true) {
      console.log(answer.slice(5));
    } else if (answer.startsWith("type ")) {
      const input: string = answer.slice(5);
      if (types.includes(input)) {
        console.log(`${input} is a shell builtin`);
      } else {
        console.log(`${input} is not a shell builtin`);
      }
    } else {
      console.log(`${answer}: command not found`);
    }
    main();
  });
}

main();
