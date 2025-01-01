// run command: ./your_program.sh
import { createInterface } from "readline";
import * as fs from "fs";
import { execSync } from "child_process";
import * as path from "path";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  // terminal: true,
});

const EXIT_COMMAND: string = "exit 0";

const BUILTIN_COMMANDS: string[] = ["exit", "echo", "type", "pwd", "cd"];

const isEchoCommand = (input: string) => input === BUILTIN_COMMANDS[1];
const isTypeCommand = (input: string) => input === BUILTIN_COMMANDS[2];
const isPwdCommand = (input: string) => input === BUILTIN_COMMANDS[3];
const isCdCommand = (input: string) => input === BUILTIN_COMMANDS[4];

function executeProgram(command: string, args: string): void {
  console.log("command: ", command, "args: ", args);

  if (command === "cat") {
    // split by quotes for multiple arguments
    const argsArray = args.split(/['"]/).filter((arg) => arg.trim() !== "");
    console.log("argsArray", argsArray);
    for (let arg of argsArray) {
      arg = parseCatQuotes(arg);
    }
    console.log("final args: ", args);
    // args = argsArray.join(" ");
  }
  try {
    const output = execSync(`${command} ${args}`, {
      stdio: "pipe",
    });
    console.log(output.toString().trim());
  } catch (error: any) {
    console.log(`${command}: command not found`);
  }
}

function handleBuiltinCommand(restArgsStr: string): void {
  if (BUILTIN_COMMANDS.includes(restArgsStr)) {
    console.log(`${restArgsStr} is a shell builtin`);
  }
}

function handlePath(command: string): void {
  // Detect the correct PATH delimiter for the current OS
  const pathDelimiter = process.platform === "win32" ? ";" : ":";
  const dirs = process.env.PATH?.split(pathDelimiter);
  // PATH="/usr/bin:/usr/local/bin"
  // dir=["/usr/bin", "/usr/local/bin"]
  // [Debugging]: console.log("Checking directories:", dirs);

  if (dirs !== undefined) {
    for (const dir of dirs) {
      const exec = `${dir}/${command}`;
      // [Debugging]: console.log(`Checking if ${exec} is executable...`);
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

function parseEchoQuotes(answer: string): void {
  // console.log("answer: ", answer);

  let stringArgs = answer.slice(5).trim();
  // console.log("stringArgs: ", stringArgs);
  const hasDoubleQuotes = stringArgs.includes('"');

  if (hasDoubleQuotes) {
    const stringArgsArray = stringArgs.split('"');
    // console.log("stringArgsArray: ", stringArgsArray);

    const output: string[] = [];
    for (let args of stringArgsArray) {
      args = args.trim();
      if (args === "") {
        continue;
      }
      args = args.replace(/"/g, "");
      // console.log('arr: ', arr);
      // console.log("input: ", input);
      output.push(args);
    }
    // console.log("output array: ", output);
    console.log(output.join(" "));
    return;
  }

  // single quote
  if (stringArgs.includes("'")) {
    stringArgs = stringArgs.replace(/'/g, "");
    console.log(stringArgs);
  } else {
    const arr = stringArgs
      .split(" ")
      .filter((x) => x !== "")
      .join(" ");
    console.log(arr);
  }
}

function parseCatQuotes(input: string): string {
  // return input.replace(/'| |"/g, "");
  let escape = false;
  let result = "";

  for (let char of input) {
    if (escape) {
      result += char;
      escape = false;
      // check if the next char is a backslash
    } else if (char === "\\") {
      escape = true;
    } else if (char !== "'" && char !== '"') {
      result += char;
    }
  }

  console.log("Parsed string:", result);
  return result;
}

// only takes one argument like posix POSIX-compliant shells
function handleCdCommand(paths: string): void {
  const beforeSlash = paths.split("/")[0];
  let newPath: string;
  switch (beforeSlash) {
    // cd
    case "":
      // don't really need to check but i guess it won't hurt
      newPath = path.isAbsolute(paths)
        ? path.resolve(paths)
        : path.resolve(process.cwd(), paths);
      break;
    case ".":
      newPath = path.resolve(process.cwd(), paths);
      break;
    case "..":
      // if multiple
      const count = paths.split("/").length;
      newPath = process.cwd();
      for (let i = 1; i < count; i++) {
        newPath = path.resolve(newPath, "..");
      }
      break;
    case "~":
      const HOME = process.env.HOME;
      if (HOME === undefined) {
        console.log("cd: $HOME is not set");
        return;
      }
      newPath = path.resolve(HOME);
      break;
    default:
      return;
  }
  try {
    process.chdir(newPath);
  } catch (error) {
    console.log(`cd: ${paths}: No such file or directory`);
  }
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
    if (isEchoCommand(command)) {
      parseEchoQuotes(answer);
      // console.log(restArgsStr);
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
    } else if (isPwdCommand(command)) {
      console.log(process.cwd());
    } else if (isCdCommand(command)) {
      handleCdCommand(restArgsStr);
    } else {
      executeProgram(command, restArgsStr);
    }

    main();
  });
}

main();
