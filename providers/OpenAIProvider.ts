import type { AIProvider, AIProviderConfig } from "./AIProviderFactory";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private systemInstruction?: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.systemInstruction = config.systemInstruction;
  }

  startChat() {
    console.log("OpenAI provider initialized with model:", this.model);
    return {};
  }

  async sendMessage(chat: any, message: string): Promise<string> {
    console.log("Sending message to OpenAI:", message.substring(0, 50) + "...");
    return "OpenAI response placeholder";
  }
}
