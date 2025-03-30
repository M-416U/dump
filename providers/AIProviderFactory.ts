import { GeminiProvider } from "./GeminiProvider";
import { OpenAIProvider } from "./OpenAIProvider";

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  systemInstruction?: string;
}

export interface AIProvider {
  startChat(history?: any): any;
  sendMessage(chat: any, message: string): Promise<string>;
  sendMessageStream?(
    chat: any,
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<string>;
}

export class AIProviderFactory {
  getProvider(providerName: string, config: AIProviderConfig): AIProvider {
    switch (providerName.toLowerCase()) {
      case "gemini":
        return new GeminiProvider(config);
      case "openai":
        return new OpenAIProvider(config);
      default:
        throw new Error(`Provider ${providerName} not supported`);
    }
  }
}
