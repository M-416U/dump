import inquirer from "inquirer";
import fs from "fs";
import { spawn } from "child_process";
import path from "path";

export async function writeToFile(
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

export async function askUser(question: string): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: "editor",
      name: "response",
      message: `${question}`,
    },
  ]);

  return answers.response;
}

export async function executeCommand(
  command: string,
  resultsDir?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: resultsDir,
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
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, "logs");
type LogType = "user" | "planner" | "tool" | "files" | "coder";
// Function to log interactions to Markdown file
export function logToMarkdown(
  session: string,
  message: string,
  type: LogType
): string {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const logFile = path.join(logsDir, `${session}-log.md`);

  // Create header if file doesn't exist
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(
      logFile,
      `# Session: ${session}\nStarted: ${new Date().toLocaleString()}\n\n`
    );
  }

  // Append message with appropriate formatting
  let formattedMessage = "";
  if (type === "user") {
    formattedMessage = `\n## 👤 User Input\n\`\`\`\n${message}\n\`\`\`\n`;
  } else if (type === "planner") {
    formattedMessage = `\n## 🤖 AI Planner Response\n\`\`\`\n${message}\n\`\`\`\n`;
  } else if (type === "tool") {
    formattedMessage = `\n## 🔧 Tool Output\n\`\`\`\n${message}\n\`\`\`\n`;
  } else if (type === "files") {
    formattedMessage = `\n## 📁 Files Generated\n\`\`\`\n${message}\n\`\`\`\n`;
  } else if (type === "coder") {
    formattedMessage = `\n## 🤖 AI Coder Response\n\`\`\`\n${message}\n\`\`\`\n`;
  }

  fs.appendFileSync(logFile, formattedMessage);
  return logFile;
}
