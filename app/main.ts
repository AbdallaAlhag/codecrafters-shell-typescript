import { createInterface } from "readline";
import * as fs from "fs";
import { execSync } from "child_process";

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

function executeProgram(command: string, args: string[]): void {
  try {
    const output = execSync(`${command} ${args.join(" ")}`, { stdio: "pipe" });
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

function handleCdCommand(paths: string): void {
  const restArgs: string[] = paths.split(" ");
  console.log(restArgs);
  for (const path of restArgs) {
    const beforeSlash = path.split("/")[0];
    let newPath: string;
    // console.log(arg)
    switch (beforeSlash) {
      case "":
        newPath = paths;
        break;
      case ".":
        newPath = process.cwd() + path.slice(1);
        break;
      case "..":
        // if multiple
        const count = path.split("/").length;
        // /home/user/project will return "/home/user"
        // newPath = process.cwd().split("/").slice(0, -1).join("/");
        const prePath = process.cwd().split("/");
        newPath = prePath.slice(0, -count).join("/");
        break;
      default:
        // root so
        newPath = "/";
        break;
    }
    try {
      process.chdir(newPath);
    } catch (error) {
      // console.log(`cd: ${paths}: No such file or directory`);
    }
    // absolute path
    // if (paths.startsWith("/")) {
    //   try {
    //     process.chdir(paths);
    //   } catch (error) {
    //     console.log(`cd: ${paths}: No such file or directory`);
    //   }
    // } else if (paths.startsWith(".")) {
    //   // go to file in current directory
    //   const newPath = process.cwd() + path.slice(1);
    //   try {
    //     process.chdir(newPath);
    //   } catch (error) {
    //     // console.log(`cd: ${paths}: No such file or directory`);
    //   }
    // } else if (paths === "..") {
    //   // go back Parent directory
    //   const newPath = process.cwd().split("/");
    //   newPath.pop();
    //   try {
    //     process.chdir(newPath.join("/"));
    //   } catch (error) {
    //     // console.log(`cd: ${paths}: No such file or directory`);
    //   }
    // } else if (paths === "") {
    //   // go to root directory
    //   process.chdir("/");
    //   try {
    //     process.chdir("/");
    //   } catch (error) {
    //     // console.log(`cd: ${paths}: No such file or directory`);
    //   }
    // }
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
    } else if (isPwdCommand(command)) {
      console.log(process.cwd());
    } else if (isCdCommand(command)) {
      handleCdCommand(restArgsStr);
    } else {
      executeProgram(command, restArgs);
    }

    main();
  });
}

main();
