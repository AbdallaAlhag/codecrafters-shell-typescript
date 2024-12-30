import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  // terminal: true,
});

// Uncomment this block to pass the first stage
function main() {
  const types: string[] = ["echo", "type"];
  rl.question("$ ", (answer: string) => {
    if (answer === "exit 0") {
      rl.close();
    }
    if (answer.startsWith("echo ") === true) {
      console.log(answer.slice(5));
      main();
    } else if (answer.startsWith("type ")) {
      const input: string = answer.slice(5);
      if (types.includes(input)) {
        console.log(`${input} is a shell builtin`);
      } else {
        console.log(`${input} is not a shell builtin`);
      }
      main();
    }
    console.log(`${answer}: command not found`);
    main();
  });
}

main();
