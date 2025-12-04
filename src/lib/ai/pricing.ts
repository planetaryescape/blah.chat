import { MODEL_CONFIG } from "./models";

export type ModelPricing = {
  input: number; // USD per 1M tokens
  output: number;
  cached?: number;
  reasoning?: number;
};

// Re-export from models.ts for backward compatibility
export const MODEL_PRICING: Record<string, ModelPricing> = Object.fromEntries(
  Object.entries(MODEL_CONFIG).map(([id, config]) => [id, config.pricing]),
);

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens?: number,
  reasoningTokens?: number,
): number {
  const model = MODEL_CONFIG[modelId];
  if (!model || model.isLocal) return 0;

  const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.output;
  const cachedCost = cachedTokens
    ? (cachedTokens / 1_000_000) * (model.pricing.cached || 0)
    : 0;
  const reasoningCost = reasoningTokens
    ? (reasoningTokens / 1_000_000) * (model.pricing.reasoning || 0)
    : 0;

  return inputCost + outputCost + cachedCost + reasoningCost;
}
