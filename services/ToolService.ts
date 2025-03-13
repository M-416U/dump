import { toolHandlers } from "../toolHandler";
import fs from "fs";
import path from "path";
import { logToMarkdown } from "../helpers";

export type ToolParams = {
  content: string;
  resultsDir: string;
  sessionId: string;
};

export class ToolService {
  private IGNORE_FOLDERS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "logs",
  ]);
  private IGNORE_FILES = new Set([".DS_Store", "thumbs.db"]);
  
  async executeTool(
    response: string,
    workspaceId: number,
    workspacePath: string
  ): Promise<string> {
    const sessionId = `workspace-${workspaceId}`;
    logToMarkdown(sessionId, response, "tool");

    // Build regex dynamically from existing handlers
    const availableTools = Object.keys(toolHandlers).join("|");
    const toolRegex = new RegExp(`<(${availableTools})>([\\s\\S]*?)<\\/\\1>`);

    const toolMatch = response.match(toolRegex);
    const files = this.listWorkspaceFiles(workspacePath);
    
    if (!toolMatch) {
      logToMarkdown(sessionId, "no tool", "tool");
      return `Current Structure:\n${files}\n`;
    }

    const [, tool, content] = toolMatch;
    let result = `Tool "${tool}" not recognized`;
    
    if (!tool || !content) return `Current Structure:\n${files}\n`;
    
    if (toolHandlers[tool]) {
      try {
        // Pass standardized parameters object with content and necessary directories
        const params: ToolParams = {
          content: content!,
          resultsDir: workspacePath,
          sessionId: sessionId,
        };
        result = await toolHandlers[tool](params);
      } catch (error: any) {
        result = `Error executing ${tool}: ${error.message}`;
      }
    }

    logToMarkdown(sessionId, result, "tool");
    return `${files}\n\nResult:\n${result}`;
  }

  listWorkspaceFiles(workspacePath: string): string {
    try {
      let output = "";

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