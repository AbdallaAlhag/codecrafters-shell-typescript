import { createInterface } from "readline";
import * as fs from "fs";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  // terminal: true,
});

const EXIT_COMMAND: string = "exit 0";

const BUILTIN_COMMANDS: string[] = ["echo", "type", "exit"];

const isEchoCommand = (input: string) => input === BUILTIN_COMMANDS[0];
const isTypeCommand = (input: string) => input === BUILTIN_COMMANDS[1];

function handleBuiltinCommand(restArgsStr: string): void {
  if (BUILTIN_COMMANDS.includes(restArgsStr)) {
    console.log(`${restArgsStr} is a shell builtin`);
  } else {
    console.log(`${restArgsStr}: not found`);
  }
}

/**
 * Check if a file exists and is executable.
 * @param filePath - The path to the file.
 * @returns True if the file exists and is executable, false otherwise.
 */
function isExecutable(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath); // Get file stats, fs.statSync retrieves metadata about the file (synchronously).
    // Check if it's a file and has execute permissions
    // stats.isFile(): Confirms the path points to a file.
    // (stats.mode & 0o111) !== 0: Ensures the file has execute permissions.
    return stats.isFile() && (stats.mode & 0o111) !== 0;
  } catch (err) {
    // If an error occurs (e.g., file does not exist), return false
    return false;
  }
}

function handlePath(command: string): void {
  const dir = process.env.PATH?.split(":");
  // PATH="/usr/bin:/usr/local/bin"
  // dir=["/usr/bin", "/usr/local/bin"]
  if (dir !== undefined) {
    for (let i = 0; i < dir.length; i++) {
      const exec = `${dir[i]}/${command}`;
      if (isExecutable(exec)) {
        console.log(`${command} is ${exec}`);
        return;
      }
    }
  }

  console.log(`${command}: not found`);
}

function main(): void {
  rl.question("$ ", (answer: string) => {
    const [command, ...restArgs] = answer.split(" ");
    const restArgsStr = restArgs.join(" ");
    // example: type exit hello world = ["type", "exit hello world"]
    // command = ["type"]
    // restArgs = ["exit", "hello", "world"]
    // restArgsStr = "exit hello world"
    if (answer === EXIT_COMMAND) {
      rl.close();
      process.exit(0);
    }
    if (isEchoCommand(command) === true) {
      console.log(restArgsStr);
    } else if (isTypeCommand(command) === true) {
      // This was for builtin: builtins
      handleBuiltinCommand(restArgsStr);
      // This is for type builtin: executable files
      handlePath(restArgsStr);
    } else {
      console.log(`${answer}: command not found`);
    }
    main();
  });
}

main();
