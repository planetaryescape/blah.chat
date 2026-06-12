import { MODEL_CONFIG, type ModelConfig } from "./models";

export type { ModelConfig };

export type UsageTokenInfo = {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
  };
  outputTokenDetails?: {
    reasoningTokens?: number;
  };
};

/**
 * Get model config by ID.
 * @param modelId - Model ID (e.g., "openai:gpt-5")
 * @param models - Optional models record (from useModels() hook). Falls back to static MODEL_CONFIG if not provided.
 */
export function getModelConfig(
  modelId: string,
  models?: Record<string, ModelConfig>,
): ModelConfig | undefined {
  const source = models ?? MODEL_CONFIG;

  // Return config if exists
  if (source[modelId]) {
    return source[modelId];
  }

  // Fallback for custom models not in config
  // Extract provider and model name
  const [provider, ...modelParts] = modelId.split(":");
  const modelName = modelParts.join(":");

  if (provider && modelName) {
    return {
      id: modelId,
      provider: provider as ModelConfig["provider"],
      name: modelName,
      description: `Custom ${provider} model`,
      contextWindow: 128000,
      pricing: { input: 0, output: 0 },
      capabilities: [],
    };
  }

  // Handle legacy model IDs without provider prefix (e.g., "claude-3-opus")
  // Infer provider from model name
  const legacyProviderMap: Record<string, ModelConfig["provider"]> = {
    gpt: "openai",
    claude: "anthropic",
    gemini: "google",
    grok: "xai",
    llama: "meta",
    mistral: "mistral",
    qwen: "alibaba",
  };

  for (const [prefix, provider] of Object.entries(legacyProviderMap)) {
    if (modelId.toLowerCase().startsWith(prefix)) {
      return {
        id: `${provider}:${modelId}`,
        provider,
        name: modelId,
        description: `Legacy ${provider} model`,
        contextWindow: 128000,
        pricing: { input: 0, output: 0 },
        capabilities: [],
      };
    }
  }

  return undefined;
}

/**
 * Group models by provider.
 * @param models - Optional models record (from useModels() hook). Falls back to static MODEL_CONFIG if not provided.
 */
export function getModelsByProvider(
  models?: Record<string, ModelConfig>,
): Record<string, ModelConfig[]> {
  const source = models ?? MODEL_CONFIG;
  const grouped: Record<string, ModelConfig[]> = {};

  for (const model of Object.values(source)) {
    if (model.isInternalOnly) continue;
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  }

  return grouped;
}

/**
 * Calculate cost for model usage.
 * @param model - Model ID
 * @param usage - Token usage counts
 * @param models - Optional models record (from useModels() hook). Falls back to static MODEL_CONFIG if not provided.
 */
export function calculateCost(
  model: string,
  usage: UsageTokenInfo & {
    inputTokens: number;
    outputTokens: number;
  },
  models?: Record<string, ModelConfig>,
): number {
  const source = models ?? MODEL_CONFIG;
  const config = source[model];
  if (!config || config.isLocal) return 0;

  const cachedInputTokens = usage.cachedInputTokens ?? usage.cachedTokens ?? 0;
  const reasoningTokens = usage.reasoningTokens ?? 0;

  const inputCost = (usage.inputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * config.pricing.output;
  const cachedCost =
    (cachedInputTokens / 1_000_000) * (config.pricing.cached || 0);
  const reasoningCost =
    (reasoningTokens / 1_000_000) * (config.pricing.reasoning || 0);

  return inputCost + outputCost + cachedCost + reasoningCost;
}

/**
 * Normalize AI SDK usage fields across v6 details and legacy top-level fallbacks.
 */
export function normalizeUsageTokens(usage?: UsageTokenInfo | null) {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens:
      usage?.inputTokenDetails?.cacheReadTokens ??
      usage?.cachedInputTokens ??
      usage?.cachedTokens ??
      0,
    reasoningTokens:
      usage?.outputTokenDetails?.reasoningTokens ?? usage?.reasoningTokens ?? 0,
  };
}

/**
 * Check if a model ID is valid.
 * @param modelId - Model ID to check
 * @param models - Optional models record (from useModels() hook). Falls back to static MODEL_CONFIG if not provided.
 */
export function isValidModel(
  modelId: string,
  models?: Record<string, ModelConfig>,
): boolean {
  const source = models ?? MODEL_CONFIG;
  return modelId in source;
}
