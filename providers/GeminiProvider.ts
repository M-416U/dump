import {
  ChatSession,
  GenerativeModel,
  GoogleGenerativeAI,
  type Content,
} from "@google/generative-ai";
import type { AIProvider, AIProviderConfig } from "./AIProviderFactory";
import fs from "fs";

// Define interface for image data
export interface ImageData {
  path?: string;
  url?: string;
  base64?: string;
  mimeType: string;
}

// Define interface for message content
export interface MessageContent {
  text: string;
  images?: ImageData[];
}

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private systemInstruction?: string;
  private generativeModel: GenerativeModel;
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

  startChat(history?: Content[]) {
    return this.generativeModel.startChat({
      history: history || [],
    });
  }

  // Helper method to convert image data to generative part
  private async imageToGenerativePart(image: ImageData): Promise<any> {
    if (image.path) {
      // Handle local file
      return {
        inlineData: {
          data: Buffer.from(fs.readFileSync(image.path)).toString("base64"),
          mimeType: image.mimeType,
        },
      };
    } else if (image.url) {
      // Handle URL
      const imageResp = await fetch(image.url).then((response) =>
        response.arrayBuffer()
      );
      return {
        inlineData: {
          data: Buffer.from(imageResp).toString("base64"),
          mimeType: image.mimeType,
        },
      };
    } else if (image.base64) {
      // Handle base64 data directly
      return {
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      };
    }
    throw new Error(
      "Invalid image data: must provide path, url, or base64 data"
    );
  }

  // Convert message content to parts for the API
  private async prepareMessageParts(
    content: string | MessageContent
  ): Promise<any[]> {
    if (typeof content === "string") {
      return [content];
    }

    const parts: any[] = [content.text];

    if (content.images && content.images.length > 0) {
      for (const image of content.images) {
        parts.push(await this.imageToGenerativePart(image));
      }
    }

    return parts;
  }

  async sendMessage(
    chat: ChatSession,
    content: string | MessageContent
  ): Promise<string> {
    const parts = await this.prepareMessageParts(content);

    // Count tokens in the message before sending (only for text part)
    const textPart = typeof content === "string" ? content : content.text;
    const countResult = await this.generativeModel.countTokens(textPart);
    this.inputTokens += countResult.totalTokens;

    const response = await chat.sendMessage(parts);

    // Get token usage from the response metadata
    if (response.response.usageMetadata) {
      // Add output tokens from this response
      this.outputTokens +=
        response.response.usageMetadata.candidatesTokenCount || 0;
    }
    return response.response.text().trim();
  }

  async sendMessageStream(
    chat: ChatSession,
    content: string | MessageContent,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const parts = await this.prepareMessageParts(content);

    // Count tokens in the message before sending (only for text part)
    const textPart = typeof content === "string" ? content : content.text;
    const countResult = await this.generativeModel.countTokens(textPart);
    this.inputTokens += countResult.totalTokens;

    const responseStream = await chat.sendMessageStream(parts);
    let fullResponse = "";

    for await (const chunk of responseStream.stream) {
      const textChunk = chunk.text();
      fullResponse += textChunk;
      onChunk(textChunk);
    }
    return fullResponse.trim();
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
