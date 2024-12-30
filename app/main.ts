import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  // terminal: true,
});

// Uncomment this block to pass the first stage
function main() {
  rl.question("$ ", (answer: string) => {
    if (answer === "exit 0") {
      rl.close();
    } else {
      console.log(`${answer}: command not found`);
      main();
    }
  });
}

main();
