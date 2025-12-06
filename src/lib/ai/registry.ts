import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { getModelConfig } from "./models";

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

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export function getModel(modelId: string, useResponsesAPI = false) {
  const [provider, model] = modelId.split(":");
  const config = getModelConfig(modelId);
  const actualModel = config?.actualModelId || model;

  switch (provider) {
    case "openai":
      // Use Responses API for reasoning models when requested
      return useResponsesAPI
        ? openai.responses(actualModel)
        : openai(actualModel);
    case "anthropic":
      return anthropic(actualModel);
    case "google":
      return google(actualModel);
    case "xai":
      return openrouter(`x-ai/${model}`);
    case "perplexity":
      // Map friendly IDs to actual Perplexity IDs on OpenRouter
      const perplexityMap: Record<string, string> = {
        "sonar-pro-search": "perplexity/sonar-pro-search",
        "sonar-reasoning-pro": "perplexity/sonar-reasoning-pro",
        "sonar-pro": "perplexity/sonar-pro",
        "sonar-deep-research": "perplexity/sonar-deep-research",
        "sonar-reasoning": "perplexity/sonar-reasoning",
        sonar: "perplexity/sonar",
      };
      return openrouter(perplexityMap[model] || `perplexity/${model}`);
    case "openrouter":
      // For generic openrouter models, we pass the model ID as is (or with prefix if needed)
      // The model ID in config is "openrouter:vendor/model-name" usually, but here we split by ":"
      // So 'model' variable holds "vendor/model-name" or just "model-name" depending on how we defined it.
      // In models.ts we defined IDs like "openrouter:llama-4-maverick".
      // We need to map these friendly names to actual OpenRouter model IDs.
      const openRouterMap: Record<string, string> = {
        "llama-4-maverick": "meta-llama/llama-4-maverick",
        "llama-4-behemoth": "meta-llama/llama-4-behemoth",
        "deepseek-v3": "deepseek/deepseek-chat-v3",
        "mistral-devstral": "mistralai/mistral-devstral",
        "qwen-3-coder-free": "qwen/qwen3-coder:free",
        "glm-4.5-air-free": "z-ai/glm-4.5-air:free",
      };
      return openrouter(openRouterMap[model] || model);
    case "ollama":
      return ollama(actualModel);
    case "groq":
      return groq(actualModel);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export const DEFAULT_MODEL = "openai:gpt-5.1";
