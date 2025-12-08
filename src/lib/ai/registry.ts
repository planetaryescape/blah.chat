import { createOpenAI } from "@ai-sdk/openai";
import { aiGateway } from "./gateway";
import { getModelConfig } from "./models";

// Ollama via OpenAI-compatible API (local only)
const ollama = createOpenAI({
  name: "ollama",
  apiKey: "ollama", // Ollama doesn't need real key
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
});

export function getModel(modelId: string, useResponsesAPI = false) {
  const [provider, model] = modelId.split(":");
  const config = getModelConfig(modelId);
  const actualModel = config?.actualModelId || model;

  // Use Vercel AI Gateway for all providers except Ollama (local)
  if (provider !== "ollama") {
    // Map to gateway model format
    const gatewayModelMap: Record<string, string> = {
      openai: `openai/${actualModel}`,
      anthropic: `anthropic/${actualModel}`,
      google: `google/${actualModel}`,
      xai: `xai/${actualModel}`,
      perplexity: `perplexity/${actualModel}`,
      openrouter: `openrouter/${actualModel}`,
      groq: `groq/${actualModel}`,
      cerebras: `cerebras/${actualModel}`,
      minimax: `minimax/${actualModel}`,
      deepseek: `deepseek/${actualModel}`,
      kimi: `kimi/${actualModel}`,
      zai: `zai/${actualModel}`,
      meta: `meta/${actualModel}`,
    };

    const gatewayModel = gatewayModelMap[provider];
    if (!gatewayModel) {
      throw new Error(`Unknown provider for gateway: ${provider}`);
    }

    return aiGateway(gatewayModel);
  }

  // Keep Ollama as direct connection (local)
  switch (provider) {
    case "ollama":
      return ollama(actualModel);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export const DEFAULT_MODEL = "openai:gpt-5.1";
