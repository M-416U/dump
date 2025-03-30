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
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface CodeAgentConfig {
  aiProvider?: string;
  aiModel?: string;
  apiKey?: string;
  codebase?: string;
  maxIterations?: number;
  verbose?: boolean;
  inputHandler?: (question: string) => Promise<string>;
  streamResponse?: boolean;
  onResponseChunk?: (chunk: string) => void;
}

export class CodeAgent {
  private aiProvider!: AIProvider;
  private agentChat: any;
  private toolService: ToolService;
  private codebasePath: string;
  private maxIterationCount: number;
  private isVerbose: boolean;
  private userInputHandler: (question: string) => Promise<string>;
  private useStreamResponse: boolean;
  private responseChunkHandler: (chunk: string) => void;
  private lastAgentResponse: string = "";
  private chatHistory: ChatMessage[] = [];
  constructor(config: CodeAgentConfig = {}) {
    if (config.codebase === undefined) {
      throw new Error("Codebase path is required");
    }
    if (config.inputHandler === undefined) {
      throw new Error("inputHandler is required");
    }
    this.codebasePath = config.codebase;
    this.maxIterationCount = config.maxIterations || 999;
    this.isVerbose = config.verbose !== undefined ? config.verbose : true;
    this.toolService = new ToolService(this.codebasePath);
    this.userInputHandler = config.inputHandler || ToolFunctions.askUser;
    this.useStreamResponse = config.streamResponse || false;
    this.responseChunkHandler =
      config.onResponseChunk ||
      ((chunk: string) => {
        if (this.isVerbose) console.log(chunk);
      });

    ToolFunctions.askUser = async (question: string) => {
      return this.userInputHandler(question);
    };
  }
  private async recreateChat(): Promise<void> {
    const oldChat = this.chatHistory;
    this.agentChat = this.aiProvider.startChat(oldChat);
  }
  async initialize(): Promise<void> {
    if (!fs.existsSync(this.codebasePath)) {
      fs.mkdirSync(this.codebasePath, { recursive: true });
    }
    const mcpManager = new MCPClientManager();
    await mcpManager.initialize();
    const availableTools = await mcpManager.getAllTools();

    const aiProviderFactory = new AIProviderFactory();
    this.aiProvider = aiProviderFactory.getProvider(
      DEFAULT_AI_CONFIG.provider,
      {
        apiKey: DEFAULT_AI_CONFIG.apiKey,
        model: DEFAULT_AI_CONFIG.model,
        systemInstruction: lander.replace(
          "{{MCPTOOLS}}",
          JSON.stringify(availableTools).replace(/\s/g, "")
        ),
      }
    );

    this.agentChat = this.aiProvider.startChat();
    this.toolService.registerTools(toolHandlers);
  }

  async retryRequest<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 5000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        if (this.isVerbose) {
          console.error(`Attempt ${attempt} failed:`, error.message);
        }
        if (error.status === 429 || error.message.includes("429")) {
          if (this.isVerbose) {
            console.log("Rate limit (429) detected, waiting for 2 minutes...");
            console.log(
              "creating new chat... with history:",
              this.chatHistory.length
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 120000));
          await this.recreateChat();
        } else if (attempt === maxRetries) {
          throw new Error("Max retries reached. API request failed.");
        } else {
          const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, exponentialDelay));
        }
      }
    }
    throw new Error("Max retries reached. API request failed.");
  }

  async processTask(taskDescription: string): Promise<string> {
    // Initial message with task description and codebase files
    const initialPrompt = taskDescription;
    let currentResponse: string;
    this.chatHistory.push({
      role: "user",
      content: JSON.stringify(initialPrompt),
    });
    // Send initial message to AI
    if (this.useStreamResponse && this.aiProvider.sendMessageStream) {
      currentResponse = await this.retryRequest(() =>
        this.aiProvider.sendMessageStream!(
          this.agentChat,
          initialPrompt,
          this.responseChunkHandler
        )
      );
    } else {
      currentResponse = await this.retryRequest(() =>
        this.aiProvider.sendMessage(this.agentChat, initialPrompt)
      );
    }

    this.lastAgentResponse = currentResponse.trim();
    let iterationCount = 0;
    this.chatHistory.push({
      role: "assistant",
      content: this.lastAgentResponse,
    });
    // Main agent loop
    while (iterationCount < this.maxIterationCount) {
      iterationCount++;

      // Execute tool based on AI response
      let toolExecutionResult = await this.toolService.executeTool(
        this.lastAgentResponse
      );

      // If no tool was executed, get user input instead
      if (!toolExecutionResult) {
        const userResponse = await this.userInputHandler(
          this.lastAgentResponse
        );
        toolExecutionResult = userResponse;
      }
      this.chatHistory.push({ role: "user", content: toolExecutionResult });
      // Send tool execution result back to AI
      if (this.useStreamResponse && this.aiProvider.sendMessageStream) {
        currentResponse = await this.retryRequest(() =>
          this.aiProvider.sendMessageStream!(
            this.agentChat,
            toolExecutionResult,
            this.responseChunkHandler
          )
        );
      } else {
        currentResponse = await this.retryRequest(() =>
          this.aiProvider.sendMessage(this.agentChat, toolExecutionResult)
        );
      }

      this.lastAgentResponse = currentResponse.trim();
    }

    return "Task completed successfully";
  }

  // Method to get the last response
  getLastResponse(): string {
    return this.lastAgentResponse || "No response available";
  }
  getChatHistory(): ChatMessage[] {
    return this.chatHistory;
  }
}

export default CodeAgent;
