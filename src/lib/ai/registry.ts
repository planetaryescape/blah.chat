import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Ollama via OpenAI-compatible API
const ollama = createOpenAI({
  name: "ollama",
  apiKey: "ollama", // Ollama doesn't need real key
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
});

export function getModel(modelId: string) {
  const [provider, model] = modelId.split(":");

  switch (provider) {
    case "openai":
      return openai(model);
    case "anthropic":
      return anthropic(model);
    case "google":
      return google(model);
    case "xai":
      return openrouter(`x-ai/${model}`);
    case "perplexity":
      return openrouter(`perplexity/${model}`);
    case "ollama":
      return ollama(model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export const DEFAULT_MODEL = "openai:gpt-5-mini";
