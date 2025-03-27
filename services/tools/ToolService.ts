import fs from "fs";
import path from "path";

export type ToolParams = {
  content: string;
  codebase: string;
};

export type ToolHandler = (params: ToolParams) => Promise<string>;

export class ToolService {
  private IGNORE_FOLDERS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "logs",
  ]);
  private IGNORE_FILES = new Set([".DS_Store", "thumbs.db"]);
  private toolHandlers: Record<string, ToolHandler> = {};
  private codebase: string;
  constructor(codebase: string) {
    this.codebase = codebase;
  }

  registerTool(name: string, handler: ToolHandler): void {
    this.toolHandlers[name] = handler;
  }

  registerTools(handlers: Record<string, ToolHandler>): void {
    Object.entries(handlers).forEach(([name, handler]) => {
      this.registerTool(name, handler);
    });
  }

  async executeTool(response: string): Promise<string | null> {
    const availableTools = Object.keys(this.toolHandlers).join("|");
    const toolRegex = new RegExp(`<(${availableTools})>([\\s\\S]*?)<\\/\\1>`);

    const toolMatch = response.match(toolRegex);
    const files = this.listCodebaseFiles(this.codebase);

    if (!toolMatch) {
      return null;
    }

    const [, tool, content] = toolMatch;
    let result = `Tool "${tool}" not recognized`;

    if (!tool || !content) return `Current Structure:\n${files}\n`;

    if (this.toolHandlers[tool]) {
      try {
        // Pass standardized parameters object with content and necessary directories
        const params: ToolParams = {
          content: content!,
          codebase: this.codebase,
        };
        result = await this.toolHandlers[tool](params);
      } catch (error: any) {
        result = `Error executing ${tool}: ${error.message}`;
      }
    }
    return `TOOL RESULT:\n${result}\n---\n"WORKING DIRECTORY STRUCTURE":${files}\n`;
  }

  listCodebaseFiles(codebase: string = this.codebase): string {
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

      readDirRecursive(codebase, "  ");

      return `\nCurrent Structure:\n ${
        output.trim() || "No files generated yet"
      }`;
    } catch (error) {
      console.error("Error listing files:", error);
      return "Error listing files";
    }
  }
}
