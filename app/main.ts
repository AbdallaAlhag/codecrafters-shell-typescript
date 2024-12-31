import { createInterface } from "readline";
import * as fs from "fs";
import { exec } from "child_process";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  // terminal: true,
});

const EXIT_COMMAND: string = "exit 0";

const BUILTIN_COMMANDS: string[] = ["echo", "type", "exit"];

const isEchoCommand = (input: string) => input === BUILTIN_COMMANDS[0];
const isTypeCommand = (input: string) => input === BUILTIN_COMMANDS[1];

/**
 * Check if a file exists and is executable.
 * @param filePath - The path to the file.
 * @returns True if the file exists and is executable, false otherwise.
 */
function isExecutable(command: string): boolean {
  const pathDelimiter = process.platform === "win32" ? ";" : ":";
  const dirs = process.env.PATH?.split(pathDelimiter);

  function isExecutableInDir(dir: string): boolean {
    const execPath = `${dir}/${command}`;
    try {
      const stats = fs.statSync(execPath);
      return stats.isFile() && (stats.mode & 0o111) !== 0;
    } catch (err) {
      return false;
    }
  }

  if (dirs !== undefined) {
    for (const dir of dirs) {
      const exec = `${dir}/${command}`;
      // console.log(`Checking if ${exec} is executable...`); // Debugging: show the path being checked

      if (isExecutableInDir(exec)) {
        // console.log(`${command} is ${exec}`);
        return true;
      }
    }
  }
  return false;

  // try {
  //   const stats = fs.statSync(filePath);
  //   return stats.isFile() && (stats.mode & 0o111) !== 0;
  // } catch (err) {
  //   console.log("not executable");
  //   return false;
  // }
}

function executeProgram(command: string, args: string[]): void {
  exec(
    `${command} ${args.join(" ")}`,
    (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
    }
  );
}

function handleBuiltinCommand(restArgsStr: string): void {
  if (BUILTIN_COMMANDS.includes(restArgsStr)) {
    console.log(`${restArgsStr} is a shell builtin`);
  }
  // } else {
  //   // console.log(`${restArgsStr}: not found`);
  //   handlePath(restArgsStr);
  // }
}

function handlePath(command: string): void {
  // Detect the correct PATH delimiter for the current OS
  const pathDelimiter = process.platform === "win32" ? ";" : ":";
  const dirs = process.env.PATH?.split(pathDelimiter);
  // PATH="/usr/bin:/usr/local/bin"
  // dir=["/usr/bin", "/usr/local/bin"]
  // console.log(dirs);
  // console.log("Checking directories:", dirs); // Debugging: show directories being checked

  if (dirs !== undefined) {
    for (const dir of dirs) {
      const exec = `${dir}/${command}`;
      // console.log(`Checking if ${exec} is executable...`); // Debugging: show the path being checked

      try {
        const files = fs.readdirSync(dir);
        if (files.includes(command)) {
          console.log(`${command} is ${dir}/${command}`);
          return;
        }
      } catch (err) {
        // Skip directories that can't be read
        continue;
      }
    }
  }

  console.log(`${command}: not found`);
}

function main(): void {
  // rl.question("$ ", (answer: string) => {
  rl.question("", (answer: string) => {
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
    if (isEchoCommand(command)) {
      console.log(restArgsStr);
    } else if (isTypeCommand(command)) {
      // This was for builtin: builtins
      if (restArgsStr) {
        if (BUILTIN_COMMANDS.includes(restArgsStr)) {
          handleBuiltinCommand(restArgsStr);
        } else {
          // This is for type builtin: executable files
          handlePath(restArgsStr);
        }
      }
    }
    // else if (isExecutable(command)) {
    //   console.log(`${command} is executable`);
    //   executeProgram(command, restArgs);
    // }
    else {
      executeProgram(command, restArgs);

      // console.log(`${answer}: command not found`);
    }

    main();
  });
}

main();
