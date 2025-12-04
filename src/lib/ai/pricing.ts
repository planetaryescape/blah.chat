export type ModelPricing = {
  input: number; // USD per 1M tokens
  output: number;
  cached?: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "openai:gpt-4o": {
    input: 2.5,
    output: 10.0,
    cached: 1.25,
  },
  "openai:gpt-4o-mini": {
    input: 0.15,
    output: 0.6,
    cached: 0.075,
  },
  "openai:gpt-5-mini": {
    input: 0.10,
    output: 0.40,
  },
  "anthropic:claude-3-5-sonnet-20241022": {
    input: 3.0,
    output: 15.0,
    cached: 0.3,
  },
  "google:gemini-2.0-flash-exp": {
    input: 0.0, // Free tier
    output: 0.0,
  },
  "xai:grok-4-fast": {
    input: 0.0, // Free on OpenRouter
    output: 0.0,
  },
};

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}
