import fs from "fs";
import path from "path";
import { Logger } from "../../helpers/logger";

export type ToolParams = {
  content: string;
  resultsDir: string;
  sessionId: string;
};

export type ToolHandler = (params: ToolParams) => Promise<string>;

export class ToolService {
  private IGNORE_FOLDERS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "logs",
    ".dump_ws",
  ]);
  private IGNORE_FILES = new Set([".DS_Store", "thumbs.db"]);
  private toolHandlers: Record<string, ToolHandler> = {};

  registerTool(name: string, handler: ToolHandler): void {
    this.toolHandlers[name] = handler;
  }

  registerTools(handlers: Record<string, ToolHandler>): void {
    Object.entries(handlers).forEach(([name, handler]) => {
      this.registerTool(name, handler);
    });
  }

  async executeTool(response: string): Promise<string> {
    const { path: workspacePath, id: workspaceId } = workspace;
    const sessionId = `workspace-${workspaceId}`;
    Logger.logToMarkdown(sessionId, response, "tool");

    // Build regex dynamically from existing handlers
    const availableTools = Object.keys(this.toolHandlers).join("|");
    const toolRegex = new RegExp(`<(${availableTools})>([\\s\\S]*?)<\\/\\1>`);

    const toolMatch = response.match(toolRegex);
    const files = this.listWorkspaceFiles();

    if (!toolMatch) {
      Logger.logToMarkdown(sessionId, "no tool", "tool");
      return `Current Structure:\n${files}\n`;
    }

    const [, tool, content] = toolMatch;
    let result = `Tool "${tool}" not recognized`;

    if (!tool || !content) return `Current Structure:\n${files}\n`;

    if (this.toolHandlers[tool]) {
      try {
        // Pass standardized parameters object with content and necessary directories
        const params: ToolParams = {
          content: content!,
          resultsDir: workspacePath,
          sessionId: sessionId,
        };
        result = await this.toolHandlers[tool](params);
      } catch (error: any) {
        result = `Error executing ${tool}: ${error.message}`;
      }
    }

    Logger.logToMarkdown(
      sessionId,
      `"WORKING DIRECTORY STRUCTURE":${files}\n\nTOOL RESULT:\n${result}`,
      "tool"
    );
    return `"WORKING DIRECTORY STRUCTURE":${files}\n\nTOOL RESULT:\n${result}`;
  }

  listWorkspaceFiles(): string {
    try {
      let output = "";
      const workspacePath = workspace.path;

      const readDirRecursive = (directory: string, indent: string = "") => {
        const items = fs.readdirSync(directory);
        for (const item of items) {
          const fullPath = path.join(directory, item);
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            if (!this.IGNORE_FOLDERS.has(item)) {
              output += `${fullPath}\n`;
              readDirRecursive(fullPath, indent + "  ");
            }
          } else if (!this.IGNORE_FILES.has(item)) {
            output += `${fullPath}\n`;
          }
        }
      };

      readDirRecursive(workspacePath, "  ");

      return `\nCurrent Structure:\n ${
        output.trim() || "No files generated yet"
      }`;
    } catch (error) {
      console.error("Error listing files:", error);
      return "Error listing files";
    }
  }
}
