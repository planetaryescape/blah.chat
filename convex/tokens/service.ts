import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { encoding_for_model, type TiktokenModel } from "@dqbd/tiktoken";
import type { CoreMessage } from "ai";
import { estimateTokens } from "./counting";

/**
 * Token counting service interface
 * Each provider implements accurate token counting for their models
 */
export interface TokenCountService {
  countText(text: string): Promise<number>;
  countMessages(messages: CoreMessage[]): Promise<number>;
}

/**
 * OpenAI token counter using tiktoken (fast, local, accurate)
 */
class OpenAITokenCounter implements TokenCountService {
  private model: string;
  private tiktokenAvailable: boolean | null = null;

  constructor(modelId: string) {
    this.model = modelId;
  }

  async countText(text: string): Promise<number> {
    if (!text || text.trim().length === 0) return 0;

    // Skip tiktoken if known to be unavailable
    if (this.tiktokenAvailable === false) {
      return estimateTokens(text);
    }

    try {
      const baseModel = this.model.includes(":")
        ? this.model.split(":")[1]
        : this.model;

      // Map to tiktoken model
      let tiktokenModel: TiktokenModel = "gpt-4o";
      if (baseModel.startsWith("gpt-5") || baseModel.startsWith("gpt-4")) {
        tiktokenModel = "gpt-4o";
      } else if (baseModel.startsWith("gpt-3.5")) {
        tiktokenModel = "gpt-3.5-turbo";
      } else if (baseModel.startsWith("o1") || baseModel.startsWith("o3")) {
        tiktokenModel = "gpt-4o";
      }

      const encoder = encoding_for_model(tiktokenModel);
      const tokens = encoder.encode(text);
      const count = tokens.length;
      encoder.free();

      // Mark tiktoken as working
      if (this.tiktokenAvailable === null) {
        this.tiktokenAvailable = true;
      }

      return count;
    } catch (error) {
      // Mark tiktoken as unavailable to avoid repeated attempts
      if (this.tiktokenAvailable === null) {
        this.tiktokenAvailable = false;
        console.warn(
          `OpenAI token counting unavailable (tiktoken WASM not supported), using estimation`,
        );
      }
      return estimateTokens(text);
    }
  }

  async countMessages(messages: CoreMessage[]): Promise<number> {
    let total = 0;

    for (const message of messages) {
      // Handle multi-part content (text + images)
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === "text") {
            total += await this.countText(part.text);
          } else if (part.type === "image") {
            // OpenAI vision pricing: ~765 tokens per image (1024x1024)
            // Detail=low: 85 tokens, Detail=high: 765-2550 depending on size
            total += 765; // Conservative mid-range estimate
          }
        }
      } else {
        const content =
          typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content);
        total += await this.countText(content);
      }

      // Per-message overhead (role, formatting, etc.)
      total += 4;
    }

    // Priming tokens for chat format
    total += 3;

    return total;
  }
}

/**
 * Anthropic token counter using native SDK
 */
class AnthropicTokenCounter implements TokenCountService {
  private client: Anthropic;
  private model: string;
  private errorLogged = false;

  constructor(modelId: string) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    // Extract base model: "anthropic:claude-opus-4-5-20251101" -> "claude-opus-4-5-20251101"
    this.model = modelId.includes(":") ? modelId.split(":")[1] : modelId;
  }

  async countText(text: string): Promise<number> {
    if (!text || text.trim().length === 0) return 0;

    try {
      // Count as single user message
      return await this.countMessages([{ role: "user", content: text }]);
    } catch (error) {
      if (!this.errorLogged) {
        this.errorLogged = true;
        console.warn(
          `Anthropic token counting failed for ${this.model}:`,
          error instanceof Error ? error.message : error,
        );
      }
      return estimateTokens(text);
    }
  }

  async countMessages(messages: CoreMessage[]): Promise<number> {
    try {
      // Convert to Anthropic message format
      const anthropicMessages = messages.map((msg) => ({
        role:
          msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      }));

      const result = await this.client.messages.countTokens({
        model: this.model,
        messages: anthropicMessages,
      });

      return result.input_tokens;
    } catch (error) {
      if (!this.errorLogged) {
        this.errorLogged = true;
        console.warn(
          `Anthropic token counting failed for ${this.model}:`,
          error instanceof Error ? error.message : error,
        );
      }
      // Fallback to estimation
      return messages.reduce((total, msg) => {
        const content =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
        return total + estimateTokens(content) + 4; // 4 tokens overhead per message
      }, 3); // 3 tokens for priming
    }
  }
}

/**
 * Google Gemini token counter using native SDK
 */
class GoogleTokenCounter implements TokenCountService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private errorLogged = false;

  constructor(modelId: string) {
    this.genAI = new GoogleGenerativeAI(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    );
    // Extract base model: "google:gemini-2.0-flash" -> "gemini-2.0-flash"
    this.model = modelId.includes(":") ? modelId.split(":")[1] : modelId;
  }

  async countText(text: string): Promise<number> {
    if (!text || text.trim().length === 0) return 0;

    try {
      return await this.countMessages([{ role: "user", content: text }]);
    } catch (error) {
      if (!this.errorLogged) {
        this.errorLogged = true;
        console.warn(
          `Google token counting failed for ${this.model}:`,
          error instanceof Error ? error.message : error,
        );
      }
      return estimateTokens(text);
    }
  }

  async countMessages(messages: CoreMessage[]): Promise<number> {
    try {
      const geminiModel = this.genAI.getGenerativeModel({ model: this.model });

      // Convert CoreMessage to Gemini format
      const contents = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [
          {
            text:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
          },
        ],
      }));

      const result = await geminiModel.countTokens({ contents });
      return result.totalTokens;
    } catch (error) {
      if (!this.errorLogged) {
        this.errorLogged = true;
        console.warn(
          `Google token counting failed for ${this.model}:`,
          error instanceof Error ? error.message : error,
        );
      }
      // Fallback to estimation
      return messages.reduce((total, msg) => {
        const content =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
        return total + estimateTokens(content) + 4;
      }, 3);
    }
  }
}

/**
 * Fallback token counter using character estimation
 * Used for providers without native counting APIs (OpenRouter, xAI, Perplexity)
 */
class FallbackTokenCounter implements TokenCountService {
  async countText(text: string): Promise<number> {
    if (!text || text.trim().length === 0) return 0;
    return estimateTokens(text);
  }

  async countMessages(messages: CoreMessage[]): Promise<number> {
    let total = 0;

    for (const message of messages) {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      total += estimateTokens(content);
      total += 4; // Per-message overhead
    }

    total += 3; // Priming tokens
    return total;
  }
}

/**
 * Factory function to get appropriate token counter for a model
 */
export async function getTokenCounter(
  modelId: string,
): Promise<TokenCountService> {
  const [provider] = modelId.split(":");

  switch (provider) {
    case "openai":
      return new OpenAITokenCounter(modelId);
    case "anthropic":
      return new AnthropicTokenCounter(modelId);
    case "google":
      return new GoogleTokenCounter(modelId);
    case "cerebras":
      // Cerebras models use Llama tokenizers, same as OpenAI
      return new OpenAITokenCounter(modelId);
    case "groq":
      // Groq models use OpenAI-compatible tokenizers
      return new OpenAITokenCounter(modelId);
    case "ollama":
      // Most Ollama models use GPT-compatible tokenizers
      return new OpenAITokenCounter(modelId);
    default:
      // OpenRouter, xAI, Perplexity, unknown providers
      console.warn(
        `Unknown provider ${provider}, using fallback token counter`,
      );
      return new FallbackTokenCounter();
  }
}
