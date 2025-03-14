import fs from "fs";
import path from "path";
import { aiInstructionPrompt } from "./prompts/frontend";
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

// AI Configuration
const AI_CONFIG = {
  provider: "gemini",
  model: "gemini-2.0-flash",
  apiKey: "AIzaSyDs0ghsn-0UviJ4K0zUFxcWi17X_rmm_AQ",
};

const resultsDir = path.join(__dirname, "results");

// Initialize MCP tools
const manager = new MCPClientManager();
await manager.initialize();
const tools = await manager.getAllTools();
const workspaceManager = new WorkspaceManager();
const localWorkspace = await workspaceManager.createWorkspace(
  "CLI",
  resultsDir
);
global.workspace = localWorkspace;

// Initialize AI provider
const aiProviderFactory = new AIProviderFactory();
const aiProvider: AIProvider = aiProviderFactory.getProvider(
  AI_CONFIG.provider,
  {
    apiKey: AI_CONFIG.apiKey,
    model: AI_CONFIG.model,
    systemInstruction: aiInstructionPrompt.replace(
      "{{MCPTOOLS}}",
      JSON.stringify(tools).replace(/\s/g, "")
    ),
  }
);

const frontPlannerChat = aiProvider.startChat();

async function retryRequest<T>(
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

async function main(): Promise<void> {
  // Generate unique session ID for logging
  const sessionId = `session-${Date.now()}`;
  console.log("Welcome to the AI CLI for App Generation");
  console.log(
    `Using AI Provider: ${AI_CONFIG.provider}, Model: ${AI_CONFIG.model}`
  );
  const toolService = new ToolService();
  toolService.registerTools(toolHandlers);
  const idea = await ToolFunctions.askUser("Enter your project idea");
  Logger.logToMarkdown(sessionId, idea, "user");
  console.log("Processing your request...");

  // Send initial prompt with explicit instruction to use tools
  const stepResponse = await retryRequest(() =>
    aiProvider.sendMessage(
      frontPlannerChat,
      `${idea}\n\n${toolService.listWorkspaceFiles()}`
    )
  );

  // Process the response and continue processing tools until complete
  let response = stepResponse;
  if (typeof response !== "string") {
    console.error("Unexpected response format from AI provider");
    response = "Error: Unexpected response format";
  }

  response = response.trim();
  console.log("\n✨ AI Planner Response:");
  console.log("--------------------");
  console.log(response);
  console.log("--------------------\n");
  Logger.logToMarkdown(sessionId, response, "planner");

  // Extract and execute tools repeatedly
  let iterationCount = 0;
  const MAX_ITERATIONS = 999; // Safety limit

  while (iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    console.log(`\n⚙️ Processing tool iteration #${iterationCount}...`);

    let toolOutput = await toolService.executeTool(response);

    // Send the tool output back to the planner for next steps
    const nextStepResponse = await retryRequest(() =>
      aiProvider.sendMessage(
        frontPlannerChat,
        `Tool output: ${toolOutput}\n\nCurrent directory structure:\n${toolService.listWorkspaceFiles()}\n\nWhat is the next step? Remember to use the proper tool format.`
      )
    );

    response = nextStepResponse;
    if (typeof response !== "string") {
      console.error("Unexpected response format from AI provider");
      response = "Error: Unexpected response format";
    }

    response = response.trim();
    console.log("\n✨ Next AI Planner Response:");
    console.log("--------------------");
    console.log(response);
    console.log("--------------------\n");
    Logger.logToMarkdown(sessionId, response, "planner");
  }

  if (iterationCount >= MAX_ITERATIONS) {
    console.log(
      "\n⚠️ Reached maximum number of iterations. Process may be incomplete."
    );
  }

  console.log("\n🎉 App generation complete!");
  const finalFiles = toolService.listWorkspaceFiles();
  console.log("\n📁 Generated Files:");
  console.log(finalFiles);

  console.log(`\n📋 Session log saved to: logs/${sessionId}-log.md`);
}

main().catch(console.error);
