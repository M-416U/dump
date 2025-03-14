import fs from "fs";
import path from "path";
import { aiInstructionPrompt } from "./prompts/frontend";
import { askUser, logToMarkdown } from "./helpers";
import { toolHandlers } from "./services/tools/toolHandler";
import { MCPClientManager } from "./MCP/MCPManager";
import {
  AIProviderFactory,
  type AIProvider,
} from "./providers/AIProviderFactory";

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

// Directory setup
const __dirname = path.dirname(__filename);
const resultsDir = path.join(__dirname, "results");

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Initialize MCP tools
const manager = new MCPClientManager();
await manager.initialize();
const tools = await manager.getAllTools();

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

async function executeTool(
  response: string,
  sessionId: string
): Promise<string> {
  logToMarkdown(sessionId, response, "tool");

  // Build regex dynamically from existing handlers
  const availableTools = Object.keys(toolHandlers).join("|");
  const toolRegex = new RegExp(`<(${availableTools})>([\\s\\S]*?)<\\/\\1>`);

  const toolMatch = response.match(toolRegex);
  const files = listResultsFiles();
  if (!toolMatch) {
    logToMarkdown(sessionId, "no tool", "tool");
    return `Current Structure:\n${files}\n`;
  }

  const [, tool, content] = toolMatch;
  let result = `Tool "${tool}" not recognized`;
  if (!tool || !content) return `Current Structure:\n${files}\n`;
  if (toolHandlers[tool]) {
    try {
      // Pass standardized parameters object with content and necessary directories
      const params: ToolParams = {
        content: content!,
        resultsDir: resultsDir,
        sessionId: sessionId,
      };
      result = await toolHandlers[tool](params);
    } catch (error: any) {
      result = `Error executing ${tool}: ${error.message}`;
    }
  }

  logToMarkdown(sessionId, result, "tool");
  return `${files}\n\nResult:\n${result}`;
}

const IGNORE_FOLDERS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "logs",
]);
const IGNORE_FILES = new Set([".DS_Store", "thumbs.db"]);

function listResultsFiles(dir: string = resultsDir): string {
  try {
    let output = "";

    function readDirRecursive(directory: string, indent: string = "") {
      const items = fs.readdirSync(directory);
      for (const item of items) {
        const fullPath = path.join(directory, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          if (!IGNORE_FOLDERS.has(item)) {
            output += `${fullPath}\n`;
            readDirRecursive(fullPath, indent + "  ");
          }
        } else if (!IGNORE_FILES.has(item)) {
          output += `${fullPath}\n`;
        }
      }
    }

    // output += `${path.basename(dir)}\n`;
    readDirRecursive(dir, "  ");

    console.log("Results Directory Structure:\n" + output);
    return `\nCurrent Structure:\n ${
      output.trim() || "No files generated yet"
    }`;
  } catch (error) {
    console.error("Error listing files:", error);
    return "Error listing files";
  }
}

async function main(): Promise<void> {
  // Generate unique session ID for logging
  const sessionId = `session-${Date.now()}`;
  console.log("Welcome to the AI CLI for App Generation");
  console.log(
    `Session ID: ${sessionId} (logs will be saved to logs/${sessionId}-log.md)`
  );
  console.log(
    `Using AI Provider: ${AI_CONFIG.provider}, Model: ${AI_CONFIG.model}`
  );

  const idea = await askUser("Enter your project idea");
  logToMarkdown(sessionId, idea, "user");
  console.log("Processing your request...");

  // Send initial prompt with explicit instruction to use tools
  const stepResponse = await retryRequest(() =>
    aiProvider.sendMessage(frontPlannerChat, `${idea}\n\n${listResultsFiles()}`)
  );

  // Process the response and continue processing tools until complete
  let response = typeof stepResponse === "string" ? stepResponse : stepResponse;
  if (typeof response !== "string") {
    console.error("Unexpected response format from AI provider");
    response = "Error: Unexpected response format";
  }

  response = response.trim();
  console.log("\n✨ AI Planner Response:");
  console.log("--------------------");
  console.log(response);
  console.log("--------------------\n");
  logToMarkdown(sessionId, response, "planner");

  // Extract and execute tools repeatedly
  let iterationCount = 0;
  const MAX_ITERATIONS = 999; // Safety limit

  while (iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    console.log(`\n⚙️ Processing tool iteration #${iterationCount}...`);

    let toolOutput = await executeTool(response, sessionId);
    console.log("\n🔧 Tool Output:");
    console.log("--------------------");
    console.log(toolOutput);
    console.log("--------------------\n");

    // Send the tool output back to the planner for next steps
    const nextStepResponse = await retryRequest(() =>
      aiProvider.sendMessage(
        frontPlannerChat,
        `Tool output: ${toolOutput}\n\nCurrent directory structure:\n${listResultsFiles()}\n\nWhat is the next step? Remember to use the proper tool format.`
      )
    );

    response =
      typeof nextStepResponse === "string"
        ? nextStepResponse
        : nextStepResponse;
    if (typeof response !== "string") {
      console.error("Unexpected response format from AI provider");
      response = "Error: Unexpected response format";
    }

    response = response.trim();
    console.log("\n✨ Next AI Planner Response:");
    console.log("--------------------");
    console.log(response);
    console.log("--------------------\n");
    logToMarkdown(sessionId, response, "planner");
  }

  if (iterationCount >= MAX_ITERATIONS) {
    console.log(
      "\n⚠️ Reached maximum number of iterations. Process may be incomplete."
    );
  }

  console.log("\n🎉 App generation complete!");
  const finalFiles = listResultsFiles();
  console.log("\n📁 Generated Files:");
  console.log(finalFiles);

  console.log(`\n📋 Session log saved to: logs/${sessionId}-log.md`);
}

main().catch(console.error);
