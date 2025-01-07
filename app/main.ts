// run command: ./your_program.sh
import { createInterface } from "readline";
import * as fs from "fs";
import { execSync } from "child_process";
import * as path from "path";
import { parse } from "shell-quote";
import { escape, split } from "shellwords";

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
  let outputFile: string | undefined;

  try {
    // console.log("answer: ", answer);
    // const exeCommand = escape(split(answer)[0]);
    const exeCommand = escape(answer);
    // console.log([exeCommand]);
    // Parse the command and arguments safely using shell-quote
    const parsed = parse(answer) as string[];
    // console.log("parsed answer: ", parsed);

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
      // console.log(args);
      for (let arg of args) {
        arg = parseCatQuotes(arg);
      }
      // console.log(args);
    }
    // Handle redirection
    const redirection = args.findIndex(
      (arg) =>
        (typeof arg === "object" && (arg as any).op === ">") ||
        (typeof arg === "object" && (arg as any).op === "1>")
    );

    const redirectionIndex = args.findIndex(
      (arg) => arg === ">" || arg === "1>"
    );
    if (redirectionIndex !== -1) {
      // Separate arguments and output file for redirection
      outputFile = args[redirectionIndex + 1]; // Get the file for redirection
      args = args.slice(0, redirectionIndex); // Get all arguments before the redirection
    }
    if (redirection !== -1) {
      // console.log("Redirection detected");
      handleRedirection(command, args);
      return;
    }

    // console.log("Parsed Command:", command);
    // console.log("Parsed Arguments:", args);
    // console.log("hi", command);
    if (command.includes(" ")) {
      command = parseExeCommand(exeCommand);
      // console.log(command);
      // command = `"${command}"`; // Use single quotes for Unix-like systems
    }

    // Resolve paths for arguments and check for file existence
    // const resolvedFiles = args.map((arg) => path.resolve(arg.trim()));
    const resolvedFiles = args.map((arg) => `"${path.resolve(arg.trim())}"`);

    // console.log(resolvedFiles.join(" "));
    // If no redirection, just print output
    const result = execSync(`${command} ${resolvedFiles.join(" ")}`, {
      encoding: "utf-8",
    });
    console.log(result.trim());
  } catch (error: any) {
    console.log(`${command}: command not found`);
  }
}

function parseExeCommand(exeCommand: string): string {
  // Split and remove the last part (file path)
  let commandParts = exeCommand.split(" ");
  commandParts.pop();
  const input = commandParts.join(" ");

  let currentArg = "";
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let escape = false;

  for (let idx = 0; idx < input.length; idx++) {
    const char = input[idx];

    if (char === "\\" && !escape) {
      escape = true;
      continue;
    }

    if (escape) {
      if (char === "n") {
        currentArg += "\n";
      } else if (inDoubleQuotes && char === "'") {
        // Keep escaped single quotes inside double quotes
        currentArg += "\\'";
      } else if (char === "\\") {
        currentArg += "\\";
      } else {
        currentArg += char;
      }
      escape = false;
    } else {
      if (char === '"' && !inSingleQuotes) {
        inDoubleQuotes = !inDoubleQuotes;
        currentArg += char;
      } else if (char === "'" && !inDoubleQuotes) {
        inSingleQuotes = !inSingleQuotes;
        currentArg += char;
      } else {
        currentArg += char;
      }
    }
  }

  return currentArg.trim();
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

  // console.log("input: ", input);
  // console.log(" output: ", output);
  // console.log(command, args);
  for (let arg of input) {
    if (arg == "1") {
      continue;
    }
    // console.log(arg);
    // const file = path.resolve(arg.trim());
    // remove leading slashes
    const file = arg.trim(); //.replace(/^\/+/, "");
    // const file = arg.trim()

    const inputPath = path.resolve(file);
    const outputPath = path.resolve(output.join(" "));

    if (!fs.existsSync(inputPath)) {
      console.log(`${command}: ${file}: No such file or directory`);
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
        console.log(`${command}: ${file}: No such file or directory`);
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
    // Remove the surrounding double quotes from the string
    // stringArgs = stringArgs.slice(1, -1);

    const output: string[] = [];
    let escape = false; // Flag to handle escape sequences
    let result = ""; // Store the final result

    for (let i = 0; i < stringArgs.length; i++) {
      let char = stringArgs[i];

      if (escape) {
        // Handle escape sequences
        if (char === "n") {
          result += "\n"; // Convert \n to newline
        } else if (char === "'") {
          result += "'"; // Handle single quote escape
        } else if (char === '"') {
          result += '"';
        } // Handle double quote escape
        else if (char === "\\") {
          result += "\\"; // Handle backslash escape
        } else {
          result += "\\" + char; // Keep other backslash escapes as they are
        }
        escape = false; // Reset escape flag after processing
      } else if (char === "\\") {
        // If a backslash is encountered, set escape flag
        escape = true;
      } else {
        // Normal character, just add it to the result
        if (char === '"') {
          continue;
        }
        result += char;
      }
    }

    output.push(result);
    outputResult = output.join(""); // Join the array into a single string
  }

  if (!redirect && startsAndEndsWithDoubleQuotes) {
    console.log(outputResult);
    return;
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
    // const normalizedOutput = outputResult
    //   .replace(/\\'/g, "'")
    //   .replace(/\\n/g, "\n")
    //   .trim();
    // console.log(normalizedOutput);
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
  if (typeof input !== "string") {
    return input;
  }
  // console.log("initial input: ", input);
  // const result = input.replace(/'| |"/g, "");
  // return result;
  let escape = false;
  let result = [];
  let currentPath = "";
  let insideDoubleQuotes = false;
  let insideSingleQuotes = false;

  for (let char of input) {
    if (escape) {
      currentPath += char; // Add the escaped character
      escape = false;
    } else if (char === "\\") {
      escape = true; // Escape the next character
    } else if (char === '"') {
      if (!insideSingleQuotes) {
        insideDoubleQuotes = !insideDoubleQuotes; // Toggle double-quote state
        currentPath += char; // Keep the quotes as part of the path
      } else {
        currentPath += char;
      }
    } else if (char === "'") {
      if (!insideDoubleQuotes) {
        insideSingleQuotes = !insideSingleQuotes; // Toggle single-quote state
        currentPath += char; // Keep the quotes as part of the path
      } else {
        currentPath += char;
      }
    } else if (char === " " && !insideSingleQuotes && !insideDoubleQuotes) {
      // Space outside of quotes indicates a new path
      if (currentPath) {
        result.push(currentPath.trim());
        currentPath = "";
      }
    } else {
      currentPath += char; // Normal character
    }
  }

  // Push the last path if any
  if (currentPath) {
    result.push(currentPath.trim());
  }

  return result.join("");
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
