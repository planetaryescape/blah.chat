import { MODEL_CONFIG, type ModelConfig } from "./models";
export type { ModelConfig };


// Migration map: old model IDs → new model IDs (vendor prefixes added)
const MODEL_ID_MIGRATIONS: Record<string, string> = {
  // Anthropic date suffix removal (gateway compliance)
  "anthropic:claude-opus-4-5-20251101": "anthropic:claude-opus-4.5",
  "anthropic:claude-sonnet-4-5-20250929": "anthropic:claude-sonnet-4.5",
  "anthropic:claude-haiku-4-5-20251001": "anthropic:claude-haiku-4.5",
  // OpenAI naming corrections (gpt-4.1 migrated to 5.1 family)
  "openai:gpt-4.1": "openai:gpt-5.1-mini",
  "openai:gpt-4.1-mini": "openai:gpt-5.1-mini",
  // Legacy GPT-5 migrations
  "openai:gpt-5": "openai:gpt-5.1",
  "openai:gpt-5-mini": "openai:gpt-5.1-mini",
  "openai:gpt-5-nano": "openai:gpt-5.1-nano",
  "openai:gpt-5-codex": "openai:gpt-5.1-codex",
  // Google experimental naming
  "google:gemini-3-pro": "google:gemini-3-pro-preview",
  // Removed models - redirect to closest alternatives
  "zai:glm-4.6": "cerebras:qwen-3-32b", // Z.ai provider not in gateway
  "kimi:kimi-k2-thinking": "deepseek:deepseek-r1", // Kimi provider not in gateway, similar reasoning model
  "minimax:m2": "openai:gpt-oss-120b", // MiniMax provider not in gateway, similar MoE model
  "zhipu:glm-4.5-air": "cerebras:qwen-3-32b", // Zhipu provider not in gateway
  "xai:grok-4": "xai:grok-4-fast", // Only grok-4-fast variants in gateway
  "xai:grok-3-mini": "xai:grok-code-fast-1", // Grok 3 not found, use code-optimized variant
  // Groq migrations
  "groq:gpt-oss-20b": "groq:openai/gpt-oss-20b",
  "groq:groq-compound": "groq:groq/compound",
  "groq:groq-compound-mini": "groq:groq/compound-mini",
  "groq:moonshotai-kimi-k2-instruct-0905":
    "groq:moonshotai/kimi-k2-instruct-0905",
  // Redirect all Llama models to single meta:llama-3.3-70b
  "groq:llama-3.1-8b-instant": "meta:llama-3.3-70b",
  "groq:llama-3.3-70b-versatile": "meta:llama-3.3-70b",
  "cerebras:llama3.1-8b": "meta:llama-3.3-70b",
  "cerebras:llama-3.3-70b": "meta:llama-3.3-70b",
  "groq:meta-llama/llama-guard-4-12b": "meta:llama-3.3-70b",
  "groq:meta-llama/llama-4-maverick-17b-128e-instruct": "meta:llama-3.3-70b",
  "groq:meta-llama/llama-4-scout-17b-16e-instruct": "meta:llama-3.3-70b",
  // Redirect removed Groq models to Cerebras equivalents (via Gateway)
  "groq:openai/gpt-oss-120b": "openai:gpt-oss-120b",
  "groq:gpt-oss-120b": "openai:gpt-oss-120b",
  "groq:qwen/qwen3-32b": "cerebras:qwen-3-32b",
  "groq:qwen-qwen3-32b": "cerebras:qwen-3-32b",
  // OpenRouter → native provider migrations
  "openrouter:llama-4-maverick": "meta:llama-4-maverick",
  "openrouter:llama-4-behemoth": "meta:llama-3.3-70b",
  "openrouter:deepseek-v3": "deepseek:deepseek-v3.2",
  "openrouter:mistral-devstral": "mistral:devstral-small",
  "openrouter:qwen-3-coder-free": "alibaba:qwen3-coder-480b",
  "openrouter:glm-4.5-air-free": "cerebras:qwen-3-32b", // zhipu not in gateway
};

export function getModelConfig(modelId: string): ModelConfig | undefined {
  // Check if migration needed
  const migratedId = MODEL_ID_MIGRATIONS[modelId] || modelId;

  // Return config if exists
  if (MODEL_CONFIG[migratedId]) {
    return MODEL_CONFIG[migratedId];
  }

  // Fallback for custom models not in config
  // Extract provider and model name
  const [provider, ...modelParts] = migratedId.split(":");
  const modelName = modelParts.join(":");

  if (provider && modelName) {
    return {
      id: migratedId,
      provider: provider as ModelConfig["provider"],
      name: modelName,
      description: `Custom ${provider} model`,
      contextWindow: 128000,
      pricing: { input: 0, output: 0 },
      capabilities: [],
    };
  }

  return undefined;
}

export function getModelsByProvider() {
  const grouped: Record<string, ModelConfig[]> = {};

  for (const model of Object.values(MODEL_CONFIG)) {
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  }

  return grouped;
}

export function calculateCost(
  model: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  },
): number {
  const config = MODEL_CONFIG[model];
  if (!config || config.isLocal) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * config.pricing.output;
  const cachedCost =
    ((usage.cachedTokens || 0) / 1_000_000) * (config.pricing.cached || 0);
  const reasoningCost =
    ((usage.reasoningTokens || 0) / 1_000_000) *
    (config.pricing.reasoning || 0);

  return inputCost + outputCost + cachedCost + reasoningCost;
}

export function isValidModel(modelId: string): boolean {
  return modelId in MODEL_CONFIG;
}
