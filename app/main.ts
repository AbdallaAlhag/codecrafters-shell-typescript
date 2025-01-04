// run command: ./your_program.sh
import { createInterface } from "readline";
import * as fs from "fs";
import { execSync } from "child_process";
import * as path from "path";
import { parse } from "shell-quote";

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

// function executeProgram(command: string, args: string[]): void {
function executeProgram(answer: string): void {
  let command: string | undefined;
  let args: string[] = [];

  try {
    // Parse the command and arguments safely using shell-quote
    const parsed = parse(answer) as string[];

    // Extract command and arguments
    if (parsed.length > 0) {
      command = parsed[0]; // The first element is the command
      args = parsed.slice(1); // The rest are the arguments
    }

    if (!command) {
      console.log("Error: No command provided");
      return;
    }
    if (command === "cat") {
      args.map((arg) => parseCatQuotes(arg));
    }
    // console.log("Parsed Command:", command);
    // console.log("Parsed Arguments:", args);

    // console.log(args);
    // Handle redirection
    const containsOperator = args.some(
      (item) =>
        (typeof item === "string" && (item === ">" || item === "1>")) ||
        (typeof item === "object" &&
          ["1>", ">"].includes((item as { op: string }).op as string))
    );

    if (containsOperator) {
      handleRedirection(command, args);
      return;
    }

    // old check
    // if (args.includes(">") || args.includes("1>")) {
    //   handleRedirection(command, args);
    //   return;
    // }

    // // Resolve paths for arguments
    // const resolvedArgs = args.map((arg) =>
    //   path.resolve(arg.trim().replace(/^\/+/, ""))
    // );

    const file = args.map((arg) => path.resolve(arg.trim()));

    if (!fs.existsSync(file[0])) {
      console.log(
        `${command}: ${file.find(
          (f) => !fs.existsSync(f)
        )}: No such file or directory`
      );
      return;
    }

    // console.log("filepath: ", file);
    // const output = execSync(`${command} ${args.join(" ").trim()}`, {
    const output = execSync(`${command} ${file.join(" ")}`, {
      stdio: "pipe",
    });
    console.log(output.toString().trim());
  } catch (error: any) {
    console.log(`${command}: command not found`);
  }
}

function handleRedirection(command: string, args: string[]): void {
  // takes 3 arguments
  // [input, >, output]
  // 1. command -> execute it
  // 2. input file to execute it on
  // 3. output file to redirect it to

  const opIndex = args.findIndex(
    (item) =>
      (typeof item === "string" && (item === ">" || item === "1>")) ||
      (typeof item === "object" &&
        ["1>", ">"].includes((item as { op: string }).op))
  );

  const input = args.slice(0, opIndex); // Everything before the operator
  const output = args.slice(opIndex + 1); // Everything after the operator

  // console.log("input: ", input, " output: ", output);
  // console.log(command, args);
  for (let arg of input) {
    // const file = path.resolve(arg.trim());
    // remove leading slashes
    const file = arg.trim(); //.replace(/^\/+/, "");
    // const file = arg.trim()

    const inputPath = path.resolve(input.join(" "));
    const outputPath = path.resolve(output.join(" "));

    if (!fs.existsSync(inputPath)) {
      console.log(`${command}: ${inputPath}: No such file or directory`);
      return;
    }

    try {
      const result = execSync(`${command} ${inputPath}`, { encoding: "utf-8" });
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      fs.writeFileSync(outputPath, result);
    } catch (err) {
      if ((err as { code: string }).code === "ENOENT") {
        console.log(`${command}: ${inputPath}: No such file or directory`);
      }
      // Handle other errors (e.g., command not found)
      else if (err instanceof Error) {
        console.log(`${command}: command not found: ${err.message}`);
      }
      // Default fallback if the error does not match above
      else {
        console.log(`${command}: An unknown error occurred`);
      }
    }
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

  let redirect = false;
  let file = "";
  let stringArgs = answer.slice(5).trim();
  let outputResult = "";
  // console.log("stringArgs: ", stringArgs);

  // check for redirection
  if (stringArgs.includes(">") || stringArgs.includes("1>")) {
    redirect = true;
    let temp = stringArgs;
    if (stringArgs.includes("1>")) {
      stringArgs = stringArgs.slice(0, stringArgs.indexOf("1>"));
      file = temp.slice(temp.indexOf("1>") + 2);

      // } else if (stringArgs.includes(">")) {
    } else {
      stringArgs = stringArgs.slice(0, stringArgs.indexOf(">"));
      file = temp.slice(temp.indexOf(">") + 1);
    }
  }

  const startsAndEndsWithDoubleQuotes =
    stringArgs.startsWith('"') && stringArgs.endsWith('"');
  // const hasDoubleQuotes = stringArgs.match(/"/g)?.length === 2;
  // const hasDoubleQuotes = stringArgs.includes('"');

  if (startsAndEndsWithDoubleQuotes) {
    const stringArgsArray = stringArgs.split('" ');

    // console.log("stringArgsArray: ", stringArgsArray);

    const output: string[] = [];
    for (let args of stringArgsArray) {
      args = args.trim();
      if (args === "") {
        continue;
      }
      // args = args.replace(/"/g, "");

      let escape = false;
      let result = "";
      // console.log(args);
      for (let char of args) {
        if (escape) {
          result += char;
          escape = false;
          // check if the next char is a backslash
        } else if (char === "\\") {
          escape = true;
        } else if (char !== '"') {
          result += char;
        }
      }

      // output.push(args);
      output.push(result);
      outputResult = output.join(" ");
    }
  }

  // single quote
  // if (stringArgs.includes("'")) {
  if (stringArgs.startsWith("'") && stringArgs.endsWith("'")) {
    const output = stringArgs.replace(/'/g, "");
    outputResult = output;
  } else {
    // const arr = stringArgs
    //   .split(" ")
    //   .filter((x) => x !== "")
    //   .join(" ");

    let escape = false;
    let space = false;
    let output = "";

    for (let char of stringArgs) {
      if (escape) {
        output += char;
        escape = false;
        // check if the next char is a backslash
      } else if (char === "\\") {
        escape = true;
      } else if (char === " ") {
        space = true;
      } else if (space) {
        output += " ";
        space = false;
        if (char !== "'" && char !== '"' && char !== " ") {
          output += char;
        }
      } else if (char !== "'" && char !== '"' && char !== " ") {
        output += char;
      }
    }
    outputResult = output;
  }
  if (!redirect) {
    console.log(outputResult);
  } else {
    file = path.resolve(file.trim());

    const dir = path.dirname(file);
    // Ensure the directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.writeFileSync(file, outputResult, "utf8");
    } catch (err) {
      console.log(`echo: ${file}: No such file or directory`);
    }
  }
}

function parseCatQuotes(input: string): string {
  return input.replace(/'| |"/g, "");
  // let escape = false;
  // let result = "";

  // for (let char of input) {
  //   if (escape) {
  //     result += char;
  //     escape = false;
  //     // check if the next char is a backslash
  //   } else if (char === "\\") {
  //     escape = true;
  //   } else if (char !== "'" && char !== '"') {
  //     result += char;
  //   }
  // }

  // console.log("Parsed string:", result);
  // return result;
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
      executeProgram(answer);
    }

    main();
  });
}

main();
