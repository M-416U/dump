import path from "path";
import { aiInstructionPrompt as enhancedPrompt } from "./prompts/enhancedPrompt";
import { MCPClientManager } from "./MCP/MCPManager";
import {
  AIProviderFactory,
  type AIProvider,
} from "./providers/AIProviderFactory";
import { toolHandlers } from "./services/tools";
import { Logger } from "./helpers/logger";
import { ToolFunctions } from "./services/tools/ToolFunctions";
import { WorkspaceManager } from "./workspace/WorkspaceManager";
import { ToolService } from "./services/tools/ToolService";

type ToolParams = {
  content: string;
  resultsDir: string;
  sessionId: string;
};

// Default AI Configuration
const DEFAULT_AI_CONFIG = {
  provider: "gemini",
  model: "gemini-2.0-flash",
  apiKey: "AIzaSyDs0ghsn-0UviJ4K0zUFxcWi17X_rmm_AQ",
};

export interface CodeAgentConfig {
  aiProvider?: string;
  aiModel?: string;
  apiKey?: string;
  resultsDir?: string;
  maxIterations?: number;
  verbose?: boolean;
  inputHandler?: (question: string) => Promise<string>;
}

export class CodeAgent {
  private aiProvider!: AIProvider;
  private frontPlannerChat: any;
  private toolService: ToolService;
  private sessionId: string;
  private resultsDir: string;
  private maxIterations: number;
  private workspaceManager: WorkspaceManager;
  private localWorkspace: any;
  private verbose: boolean;
  private inputHandler: (question: string) => Promise<string>;

  constructor(config: CodeAgentConfig = {}) {
    // Generate unique session ID for logging
    this.sessionId = `session-${Date.now()}`;
    this.resultsDir = config.resultsDir || path.join(__dirname, "results");
    this.maxIterations = config.maxIterations || 999;
    this.verbose = config.verbose !== undefined ? config.verbose : true;
    this.toolService = new ToolService();
    this.workspaceManager = new WorkspaceManager();
    // Use custom input handler if provided, otherwise use the default ToolFunctions.askUser
    this.inputHandler = config.inputHandler || ToolFunctions.askUser;

    // Override the askUser function in ToolFunctions to use our input handler
    ToolFunctions.askUser = async (question: string) => {
      return this.inputHandler(question);
    };
  }

  async initialize(): Promise<void> {
    // Initialize MCP tools
    const manager = new MCPClientManager();
    await manager.initialize();
    const tools = await manager.getAllTools();

    this.localWorkspace = await this.workspaceManager.createWorkspace(
      "CodeAgent",
      this.resultsDir
    );
    global.workspace = this.localWorkspace;

    // Initialize AI provider
    const aiProviderFactory = new AIProviderFactory();
    this.aiProvider = aiProviderFactory.getProvider(
      DEFAULT_AI_CONFIG.provider,
      {
        apiKey: DEFAULT_AI_CONFIG.apiKey,
        model: DEFAULT_AI_CONFIG.model,
        systemInstruction: enhancedPrompt.replace(
          "{{MCPTOOLS}}",
          JSON.stringify(tools).replace(/\s/g, "")
        ),
      }
    );

    this.frontPlannerChat = this.aiProvider.startChat();
    this.toolService.registerTools(toolHandlers);

    if (this.verbose) {
      console.log("CodeAgent initialized successfully");
    }
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
        if (this.verbose) {
          console.error(`Attempt ${attempt} failed:`, error.message);
        }
        if (error.status === 429 || error.message.includes("429")) {
          if (this.verbose) {
            console.log("Rate limit (429) detected, waiting for 2 minutes...");
          }
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

  async processIdea(idea: string): Promise<string> {
    Logger.logToMarkdown(this.sessionId, idea, "user");
    if (this.verbose) {
      console.log("Processing request...");
    }

    // Send initial prompt with explicit instruction to use tools
    const stepResponse = await this.retryRequest(() =>
      this.aiProvider.sendMessage(
        this.frontPlannerChat,
        `${idea}\n\n${this.toolService.listWorkspaceFiles()}`
      )
    );

    // Process the response and continue processing tools until complete
    let response = stepResponse;
    if (typeof response !== "string") {
      if (this.verbose) {
        console.error("Unexpected response format from AI provider");
      }
      response = "Error: Unexpected response format";
    }

    response = response.trim();
    if (this.verbose) {
      console.log("\n✨ AI Planner Response:");
      console.log("--------------------");
      console.log(response);
      console.log("--------------------\n");
    }
    Logger.logToMarkdown(this.sessionId, response, "planner");

    // Extract and execute tools repeatedly
    let iterationCount = 0;

    while (iterationCount < this.maxIterations) {
      iterationCount++;
      if (this.verbose) {
        console.log(`\n⚙️ Processing tool iteration #${iterationCount}...`);
      }

      let toolOutput = await this.toolService.executeTool(response);

      // Send the tool output back to the planner for next steps
      const nextStepResponse = await this.retryRequest(() =>
        this.aiProvider.sendMessage(this.frontPlannerChat, `${toolOutput}`)
      );

      response = nextStepResponse;
      if (typeof response !== "string") {
        if (this.verbose) {
          console.error("Unexpected response format from AI provider");
        }
        response = "Error: Unexpected response format";
      }

      response = response.trim();
      if (this.verbose) {
        console.log("\n✨ Next AI Planner Response:");
        console.log("--------------------");
        console.log(response);
        console.log("--------------------\n");
      }
      Logger.logToMarkdown(this.sessionId, response, "planner");
    }

    if (iterationCount >= this.maxIterations) {
      if (this.verbose) {
        console.log(
          "\n⚠️ Reached maximum number of iterations. Process may be incomplete."
        );
      }
    }

    const finalFiles = this.toolService.listWorkspaceFiles();
    if (this.verbose) {
      console.log("\n🎉 App generation complete!");
      console.log("\n📁 Generated Files:");
      console.log(finalFiles);
      console.log(`\n📋 Session log saved to: logs/${this.sessionId}-log.md`);
    }
    return finalFiles;
  }

  async runCLI(): Promise<void> {
    console.log("Welcome to the AI CLI for App Generation");
    console.log(
      `Using AI Provider: ${DEFAULT_AI_CONFIG.provider}, Model: ${DEFAULT_AI_CONFIG.model}`
    );
    const idea = await this.inputHandler("Enter your project idea");
    await this.processIdea(idea);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getWorkspace(): any {
    return this.localWorkspace;
  }
}

// CLI entry point (only runs when directly executed)
if (require.main === module) {
  async function main() {
    const agent = new CodeAgent();
    await agent.initialize();
    await agent.runCLI();
  }

  main().catch(console.error);
}

// Export for use as a module
export default CodeAgent;
