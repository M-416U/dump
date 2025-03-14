import path from "path";
import fs from "fs";
type LogType = "user" | "planner" | "tool" | "files" | "coder";
export class Logger {
  private static instance: Logger;
  private logsDir = path.join(__dirname, "logs");

  constructor(logDir?: string) {
    if (logDir) {
      this.logsDir = logDir;
    }
  }

  private static getInstance(logDir?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(logDir);
    }
    return Logger.instance;
  }

  static logToMarkdown(
    session: string,
    message: string,
    type: LogType
  ): string {
    return Logger.getInstance().logToMarkdown(session, message, type);
  }

  logToMarkdown(session: string, message: string, type: LogType): string {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    const logFile = path.join(this.logsDir, `${session}-log.md`);

    // Create header if file doesn't exist
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(
        logFile,
        `# Session: ${session}\nStarted: ${new Date().toLocaleString()}\n\n`
      );
    }

    let formattedMessage = "";
    if (type === "user") {
      formattedMessage = `\n## 👤 User Input\n\`\`\`\n${message}\n\`\`\`\n`;
    } else if (type === "planner" || type === "coder") {
      formattedMessage = `\n## 🤖 AI\n\`\`\`\n${message}\n\`\`\`\n`;
    } else if (type === "tool") {
      formattedMessage = `\n## 🔧 Tool Output\n\`\`\`\n${message}\n\`\`\`\n`;
    } else if (type === "files") {
      formattedMessage = `\n## 📁 Files Generated\n\`\`\`\n${message}\n\`\`\`\n`;
    }
    fs.appendFileSync(logFile, formattedMessage);
    return logFile;
  }
}
