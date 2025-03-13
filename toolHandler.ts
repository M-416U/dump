import fs from "fs";
import path from "path";
import { askUser, writeToFile } from "./helpers.js";
import { processDiffBlocks, processReplaceInFile } from "./applyDiffMode.js";
import { MCPClientManager } from "./MCP/MCPManager.js";

interface ToolParams {
  content?: string;
  resultsDir: string;
  sessionId?: string;
}

type ToolHandler = (params: ToolParams) => Promise<string>;

export const toolHandlers: Record<string, ToolHandler> = {
  READFILE: async ({ content, resultsDir }: ToolParams): Promise<string> => {
    if (!content) return "No file path provided";
    const filePath = path.join(resultsDir, content.trim());
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    return "File not found";
  },

  ASKUSER: async ({ content }: ToolParams): Promise<string> => {
    if (!content) return "No question provided";
    const question = content.trim();
    return await askUser(question);
  },

  COMMAND: async ({ content }: ToolParams): Promise<string> => {
    if (!content) return "No command provided";
    let command = content.trim();
    if (process.platform === "win32" && command === "ls") {
      command = "dir";
    }
    return await askUser(`RUN THIS:\t ${command}`);
    // return await executeCommand(command);
  },

  CODE: async ({ content, resultsDir }: ToolParams): Promise<string> => {
    if (!content) return "No code content provided";
    console.log("Processing CODE block with content length:", content.length);
    console.log("First 100 chars:", content.substring(0, 100));

    // Check if the content is wrapped in a DIFFBLOCK tag
    if (
      !content.includes("<DIFFBLOCK>") &&
      (content.includes("new file mode") ||
        content.includes("--- ") ||
        content.includes("+++ "))
    ) {
      // Wrap it in DIFFBLOCK tags if it's not already
      content = `<DIFFBLOCK>\n${content}\n</DIFFBLOCK>`;
    }

    const diffResult = processDiffBlocks(content, resultsDir);
    return diffResult ? diffResult.message : "Code processed successfully";
  },

  REPLACEINFILE: async ({
    content,
    resultsDir,
  }: ToolParams): Promise<string> => {
    if (!content) return "No content provided";
    const diffResult = processReplaceInFile(content, resultsDir);
    return diffResult ? diffResult.message : "File modified successfully";
  },

  LISTFILES: async ({ resultsDir }: ToolParams): Promise<string> => {
    try {
      const items = fs.readdirSync(resultsDir);
      return items.join("\n");
    } catch (error: any) {
      return `Error listing files: ${error.message}`;
    }
  },

  WRITETOFILE: async ({ content, resultsDir }: ToolParams): Promise<string> => {
    if (!content) return "No content provided";
    const pathMatch = content.match(/<path>(.*?)<\/path>/s);
    const contentMatch = content.match(/<content>(.*?)<\/content>/s);
    if (pathMatch && contentMatch) {
      const filePath = path.join(resultsDir, pathMatch[1]!.trim());
      const fileContent = contentMatch[1]!.trim();
      return await writeToFile(filePath, fileContent);
    }
    return "Invalid WRITETOFILE format: Missing <path> or <content>";
  },

  MCP: async ({ content }: ToolParams) => {
    try {
      if (!content) return "No content provided";
      const mcpData = JSON.parse(content);
      const manager = new MCPClientManager();
      await manager.initialize();
      const { tool, args, server } = mcpData;
      console.log(`Executing MCP Tool: ${tool} with parameters:`, args);
      const toolResult = await manager.callTool(server, tool, args);
      return toolResult || "no result";
    } catch (error: any) {
      return `Error parsing MCP JSON: ${error.message}`;
    }
  },
  DONE: async ({ content }: ToolParams) => {
    if (!content) return "No question provided";
    const completed = content.trim();
    return await askUser(
      `Task Completed:\n${completed}\n Anything i can help you with =>`
    );
  },
};
