import { ToolHandlerFunctions } from "../../toolHandler";
import type { ToolHandler } from "../ToolService";

export const toolHandlers: Record<string, ToolHandler> = {
  READFILE: ToolHandlerFunctions.readFileHandler,
  ASKUSER: ToolHandlerFunctions.askUserHandler,
  COMMAND: ToolHandlerFunctions.commandHandler,
  CODE: ToolHandlerFunctions.codeHandler,
  REPLACEINFILE: ToolHandlerFunctions.replaceInFileHandler,
  LISTFILES: ToolHandlerFunctions.listFilesHandler,
  WRITETOFILE: ToolHandlerFunctions.writeToFileHandler,
  MCP: ToolHandlerFunctions.mcpHandler,
  DONE: ToolHandlerFunctions.doneHandler,
};
