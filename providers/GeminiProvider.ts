import { ChatSession, GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AIProviderConfig } from "./AIProviderFactory";
import { Logger } from "../helpers/logger";

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private systemInstruction?: string;
  private generativeModel: any;
  private inputTokens: number = 0;
  private outputTokens: number = 0;

  constructor(config: AIProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.systemInstruction = config.systemInstruction;
    this.generativeModel = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: this.systemInstruction,
    });
  }

  startChat() {
    return this.generativeModel.startChat({
      history: [],
    });
  }

  async sendMessage(chat: ChatSession, message: string): Promise<string> {
    // Count tokens in the message before sending
    const countResult = await this.generativeModel.countTokens(message);
    this.inputTokens += countResult.totalTokens;

    const response = await chat.sendMessage(message);

    // Get token usage from the response metadata
    if (response.response.usageMetadata) {
      // Add output tokens from this response
      this.outputTokens +=
        response.response.usageMetadata.candidatesTokenCount || 0;
    }
    Logger.logToMarkdown(
      "usage-metadata",
      `===============\nMESSAGE:${message.substring(0, 300)}\n${JSON.stringify(
        response.response.usageMetadata,
        null,
        2
      )}\n===============\n`,
      "tool"
    );
    Logger.logToMarkdown(
      "USAGE",
      `===============\ninputTokens:${this.inputTokens}\noutputTokens:${
        this.inputTokens
      }\nTOTAL:${this.inputTokens + this.outputTokens}\n===============\n`,
      "tool"
    );
    return response.response.text().trim();
  }

  // Methods to retrieve token usage
  getInputTokenCount(): number {
    return this.inputTokens;
  }

  getOutputTokenCount(): number {
    return this.outputTokens;
  }

  getTotalTokenCount(): number {
    return this.inputTokens + this.outputTokens;
  }
}
