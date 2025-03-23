import inquirer from "inquirer";
import fs from "fs";
import { spawn } from "child_process";

export class ToolFunctions {
  static async writeToFile(
    filePath: string,
    fileContent: string
  ): Promise<string> {
    let result: string;
    try {
      fs.writeFileSync(filePath, fileContent, "utf8");
      result = "File written successfully";
    } catch (error: any) {
      result = `Error writing file: ${error}`;
    }
    return result;
  }

  static async askUser(question: string): Promise<string> {
    const answers = await inquirer.prompt([
      {
        type: "editor",
        name: "response",
        message: `${question}`,
      },
    ]);

    return answers.response;
  }

  static async executeCommand(
    command: string,
    codebase: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        cwd: codebase,
        stdio: ["inherit", "pipe", "pipe"],
        shell: true,
      });

      let output = "";
      let errorOutput = "";

      child.stdout.on("data", (data) => {
        process.stdout.write(data);
        output += data.toString();
      });

      child.stderr.on("data", (data) => {
        process.stderr.write(data);
        errorOutput += data.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed (code ${code}): ${errorOutput}`));
        } else {
          resolve(output.trim());
        }
      });

      child.on("error", (error) => {
        reject(new Error(`Process execution error: ${error.message}`));
      });

      process.on("SIGINT", () => {
        child.kill("SIGINT");
        reject(new Error("Command interrupted by user"));
      });
    });
  }
}
