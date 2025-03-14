import { processDiffBlocks, processReplaceInFile } from "./applyDiffMode";
import { MCPClientManager } from "./MCP/MCPManager";
import { ToolFunctions } from "./services/ToolFunctions";
import type { ToolParams } from "./services/ToolService";
import fs from "fs";
import path from "path";

export class ToolHandlerFunctions {
  static async readFileHandler({
    content,
    resultsDir,
  }: ToolParams): Promise<string> {
    if (!content) return "No file path provided";
    const filePath = path.join(resultsDir, content.trim());
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    return "File not found";
  }

  static async askUserHandler({ content }: ToolParams): Promise<string> {
    if (!content) return "No question provided";
    const question = content.trim();
    return await ToolFunctions.askUser(question);
  }

  static async commandHandler({ content }: ToolParams): Promise<string> {
    if (!content) return "No command provided";
    let command = content.trim();
    if (process.platform === "win32" && command === "ls") {
      command = "dir";
    }
    return await ToolFunctions.askUser(`RUN THIS:\t ${command}`);
    // return await ToolFunctions.executeCommand(command);
  }

  static async codeHandler({
    content,
    resultsDir,
  }: ToolParams): Promise<string> {
    if (!content) return "No code content provided";
    console.log("Processing CODE block with content length:", content.length);
    console.log("First 100 chars:", content.substring(0, 100));

    if (
      !content.includes("<DIFFBLOCK>") &&
      (content.includes("new file mode") ||
        content.includes("--- ") ||
        content.includes("+++ "))
    ) {
      content = `<DIFFBLOCK>\n${content}\n</DIFFBLOCK>`;
    }

    const diffResult = processDiffBlocks(content, resultsDir);
    return diffResult ? diffResult.message : "Code processed successfully";
  }

  static async replaceInFileHandler({
    content,
    resultsDir,
  }: ToolParams): Promise<string> {
    if (!content) return "No content provided";
    const diffResult = processReplaceInFile(content, resultsDir);
    return diffResult ? diffResult.message : "File modified successfully";
  }

  static async listFilesHandler({ resultsDir }: ToolParams): Promise<string> {
    try {
      const items = fs.readdirSync(resultsDir);
      return items.join("\n");
    } catch (error: any) {
      return `Error listing files: ${error.message}`;
    }
  }

  static async writeToFileHandler({
    content,
    resultsDir,
  }: ToolParams): Promise<string> {
    if (!content) return "No content provided";
    const pathMatch = content.match(/<path>(.*?)<\/path>/s);
    const contentMatch = content.match(/<content>(.*?)<\/content>/s);
    if (pathMatch && contentMatch) {
      const filePath = path.join(resultsDir, pathMatch[1]!.trim());
      const fileContent = contentMatch[1]!.trim();
      return await ToolFunctions.writeToFile(filePath, fileContent);
    }
    return "Invalid WRITETOFILE format: Missing <path> or <content>";
  }

  static async mcpHandler({ content }: ToolParams): Promise<string> {
    try {
      if (!content) return "No content provided";
      const mcpData = JSON.parse(content);
      const manager = new MCPClientManager();
      await manager.initialize();
      const { tool, args, server } = mcpData;
      const toolResult = await manager.callTool(server, tool, args);
      return toolResult || "no result";
    } catch (error: any) {
      return `Error parsing MCP JSON: ${error.message}`;
    }
  }

  static async doneHandler({ content }: ToolParams): Promise<string> {
    if (!content) return "No question provided";
    const completed = content.trim();
    return await ToolFunctions.askUser(
      `Task Completed:\n${completed}\n Anything I can help you with =>`
    );
  }
}
