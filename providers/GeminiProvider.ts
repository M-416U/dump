import { ChatSession, GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AIProviderConfig } from "./AIProviderFactory";

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private systemInstruction?: string;

  constructor(config: AIProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.systemInstruction = config.systemInstruction;
  }

  startChat() {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: this.systemInstruction,
    });

    return model.startChat({
      history: [],
    });
  }

  async sendMessage(chat: ChatSession, message: string): Promise<string> {
    const response = await chat.sendMessage(message);
    return response.response.text().trim();
  }
}
