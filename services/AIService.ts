import {
  AIProviderFactory,
  type AIProvider,
} from "../providers/AIProviderFactory";
import { aiInstructionPrompt } from "../prompts/mainPrompt";
import { MCPClientManager } from "../MCP/MCPManager";
import { WorkspaceManager } from "../workspace/WorkspaceManager";

export class AIService {
  private aiProvider: AIProvider | null;
  private mcpManager: MCPClientManager;
  private workspaceManager: WorkspaceManager;

  constructor(workspaceManager?: WorkspaceManager) {
    this.mcpManager = new MCPClientManager();
    this.aiProvider = null;
    this.workspaceManager = workspaceManager || new WorkspaceManager();
  }

  async initialize(): Promise<void> {
    await this.mcpManager.initialize();

    // Default AI configuration
    const AI_CONFIG = {
      provider: "gemini",
      model: "gemini-2.0-flash",
      apiKey: "AIzaSyDs0ghsn-0UviJ4K0zUFxcWi17X_rmm_AQ",
    };

    // Initialize the AI provider here instead
    this.aiProvider = await this.initializeAIProvider(AI_CONFIG);
  }
  private async initializeAIProvider(config: {
    provider: string;
    model: string;
    apiKey: string;
  }): Promise<AIProvider> {
    const aiProviderFactory = new AIProviderFactory();
    const systemInstruction = await this.getSystemInstruction();

    return aiProviderFactory.getProvider(config.provider, {
      apiKey: config.apiKey,
      model: config.model,
      systemInstruction: systemInstruction,
    });
  }
  private async getSystemInstruction(): Promise<string> {
    const tools = await this.mcpManager.getAllTools();
    return aiInstructionPrompt.replace(
      "{{MCPTOOLS}}",
      JSON.stringify(tools).replace(/\s/g, "")
    );
  }

  startChat(): any {
    return this.aiProvider?.startChat();
  }

  async sendMessage(chatId: any, message: string): Promise<string> {
    if (!this.aiProvider) {
      throw new Error("AI provider is not initialized");
    }

    // Save user message to workspace chat history
    if (this.workspaceManager.getCurrentWorkspace()) {
      this.workspaceManager.saveChatMessage("user", message);
    }

    // Send message to AI provider
    const response = await this.retryRequest(() =>
      this.aiProvider!.sendMessage(chatId, message)
    );

    // Save AI response to workspace chat history
    if (this.workspaceManager.getCurrentWorkspace()) {
      this.workspaceManager.saveChatMessage("planner", response);
    }

    return response;
  }

  async retryRequest<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 5,
    delay: number = 5000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (error.status === 429 || error.message.includes("429")) {
          console.log("Rate limit (429) detected, waiting for 2 minutes...");
          await new Promise((resolve) => setTimeout(resolve, 120000));
        } else if (attempt === maxRetries) {
          throw new Error("Max retries reached. API request failed.");
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, delay * Math.pow(2, attempt - 1))
          );
        }
      }
    }
    throw new Error("Max retries reached. API request failed.");
  }

  async getAllTools() {
    return this.mcpManager.getAllTools();
  }

  // New methods for workspace integration

  /**
   * Get the current workspace
   */
  getCurrentWorkspace() {
    return this.workspaceManager.getCurrentWorkspace();
  }

  /**
   * Open a workspace by ID
   */
  async openWorkspace(id: number) {
    return this.workspaceManager.openWorkspace(id);
  }

  /**
   * Create a new workspace
   */
  createWorkspace(name: string, basePath: string) {
    return this.workspaceManager.createWorkspace(name, basePath);
  }

  /**
   * Get all workspaces
   */
  async getAllWorkspaces() {
    return this.workspaceManager.getAllWorkspaces();
  }

  /**
   * Get chat history for current workspace
   */
  async getChatHistory() {
    return this.workspaceManager.getChatHistory();
  }
}
