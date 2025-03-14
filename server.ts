import express from "express";
import cors from "cors";
import { WorkspaceManager } from "./workspace/WorkspaceManager";
import { AIService } from "./services/AIService";
import { ToolService } from "./services/tools/ToolService";
import { toolHandlers } from "./services/tools";
import { workspaceRouter } from "./routes/workspace.route";

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const workspaceManager = new WorkspaceManager();
const aiService = new AIService();
const toolService = new ToolService();
toolService.registerTools(toolHandlers);
// Initialize services before starting server
async function initializeServices() {
  try {
    await aiService.initialize();
    console.log("AI Service initialized successfully");
    app.use("/api/workspaces", workspaceRouter);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser`);
    });
  } catch (error) {
    console.error("Failed to initialize services:", error);
    process.exit(1);
  }
}

// Start initialization
initializeServices();

export { workspaceManager, aiService, toolService };
