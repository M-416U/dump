import { aiInstructionPrompt as enhancedPrompt } from "./prompts/enhancedPrompt";
// import { aiInstructionPrompt as enhancedPrompt } from "./prompts/mainPrompt";
import { MCPClientManager } from "./MCP/MCPManager";
import {
  AIProviderFactory,
  type AIProvider,
} from "./providers/AIProviderFactory";
import { toolHandlers } from "./services/tools";
import { ToolFunctions } from "./services/tools/ToolFunctions";
import { ToolService } from "./services/tools/ToolService";
import fs from "fs";
import { lander } from "./prompts/uiPrompt";
const DEFAULT_AI_CONFIG = {
  provider: "gemini",
  model: "gemini-2.0-flash",
  apiKey: "AIzaSyDs0ghsn-0UviJ4K0zUFxcWi17X_rmm_AQ",
};

export interface CodeAgentConfig {
  aiProvider?: string;
  aiModel?: string;
  apiKey?: string;
  codebase?: string;
  maxIterations?: number;
  verbose?: boolean;
  inputHandler?: (question: string) => Promise<string>;
}

export class CodeAgent {
  private aiProvider!: AIProvider;
  private frontPlannerChat: any;
  private toolService: ToolService;
  private codebase: string;
  private maxIterations: number;
  private verbose: boolean;
  private inputHandler: (question: string) => Promise<string>;

  constructor(config: CodeAgentConfig = {}) {
    if (config.codebase === undefined) {
      throw new Error("Codebase path is required");
    }
    this.codebase = config.codebase;
    this.maxIterations = config.maxIterations || 999;
    this.verbose = config.verbose !== undefined ? config.verbose : true;
    this.toolService = new ToolService(this.codebase);
    this.inputHandler = config.inputHandler || ToolFunctions.askUser;

    ToolFunctions.askUser = async (question: string) => {
      return this.inputHandler(question);
    };
  }

  async initialize(): Promise<void> {
    if (!fs.existsSync(this.codebase)) {
      fs.mkdirSync(this.codebase, { recursive: true });
    }
    const manager = new MCPClientManager();
    await manager.initialize();
    const tools = await manager.getAllTools();

    const aiProviderFactory = new AIProviderFactory();
    this.aiProvider = aiProviderFactory.getProvider(
      DEFAULT_AI_CONFIG.provider,
      {
        apiKey: DEFAULT_AI_CONFIG.apiKey,
        model: DEFAULT_AI_CONFIG.model,
        systemInstruction: lander.replace(
          "{{MCPTOOLS}}",
          JSON.stringify(tools).replace(/\s/g, "")
        ),
      }
    );

    this.frontPlannerChat = this.aiProvider.startChat();
    this.toolService.registerTools(toolHandlers);
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

  async processTask(idea: string): Promise<string> {
    const stepResponse = await this.retryRequest(() =>
      this.aiProvider.sendMessage(
        this.frontPlannerChat,
        `${idea}\n\n${this.toolService.listCodebaseFiles()}`
      )
    );

    let response = stepResponse;

    response = response.trim();

    let iterationCount = 0;

    while (iterationCount < this.maxIterations) {
      iterationCount++;
      let toolOutput = await this.toolService.executeTool(response);

      const nextStepResponse = await this.retryRequest(() =>
        this.aiProvider.sendMessage(this.frontPlannerChat, `${toolOutput}`)
      );

      response = nextStepResponse;

      response = response.trim();
    }

    return "task finished";
  }
}

if (require.main === module) {
  async function main() {
    const agent = new CodeAgent();
    await agent.initialize();
  }

  main().catch(console.error);
}

export default CodeAgent;
