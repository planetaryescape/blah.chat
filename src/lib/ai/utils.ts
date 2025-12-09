import { MODEL_CONFIG, type ModelConfig } from "./models";
export type { ModelConfig };

export function getModelConfig(modelId: string): ModelConfig | undefined {
  // Return config if exists
  if (MODEL_CONFIG[modelId]) {
    return MODEL_CONFIG[modelId];
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
