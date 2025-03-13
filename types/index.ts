import { WorkspaceManager } from "../workspace/WorkspaceManager";
import { AIService } from "../services/AIService";
import { ToolService } from "../services/ToolService";

declare global {
  namespace Express {
    interface Request {
      services: {
        workspaceManager: WorkspaceManager;
        aiService: AIService;
        toolService: ToolService;
      };
      session: {
        chatSessions?: Record<number, any>;
      };
    }
  }
}
