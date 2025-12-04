export interface ModelConfig {
  id: string;
  provider: "openai" | "anthropic" | "google" | "xai" | "perplexity" | "ollama" | "openrouter";
  name: string;
  description?: string;
  contextWindow: number;
  pricing: {
    input: number;
    output: number;
    cached?: number;
    reasoning?: number;
  };
  capabilities: ("vision" | "function-calling" | "thinking" | "extended-thinking")[];
  supportsThinkingEffort?: boolean;
  isLocal?: boolean;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // OpenAI
  "openai:gpt-5": {
    id: "openai:gpt-5",
    provider: "openai",
    name: "GPT-5",
    description: "Most capable GPT model",
    contextWindow: 200000,
    pricing: { input: 5.0, output: 15.0, cached: 2.5 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-5-mini": {
    id: "openai:gpt-5-mini",
    provider: "openai",
    name: "GPT-5 Mini",
    description: "Fast and affordable",
    contextWindow: 128000,
    pricing: { input: 0.10, output: 0.40 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-5-nano": {
    id: "openai:gpt-5-nano",
    provider: "openai",
    name: "GPT-5 Nano",
    description: "Ultra-fast, minimal cost",
    contextWindow: 128000,
    pricing: { input: 0.05, output: 0.15 },
    capabilities: ["function-calling"],
  },
  "openai:gpt-4o": {
    id: "openai:gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    description: "Multimodal flagship",
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10.0, cached: 1.25 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-4o-mini": {
    id: "openai:gpt-4o-mini",
    provider: "openai",
    name: "GPT-4o Mini",
    description: "Compact multimodal",
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.6, cached: 0.075 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:o1": {
    id: "openai:o1",
    provider: "openai",
    name: "o1",
    description: "Advanced reasoning",
    contextWindow: 200000,
    pricing: { input: 15.0, output: 60.0, reasoning: 15.0 },
    capabilities: ["thinking"],
    supportsThinkingEffort: true,
  },
  "openai:o1-mini": {
    id: "openai:o1-mini",
    provider: "openai",
    name: "o1-mini",
    description: "Faster reasoning",
    contextWindow: 128000,
    pricing: { input: 3.0, output: 12.0, reasoning: 3.0 },
    capabilities: ["thinking"],
    supportsThinkingEffort: true,
  },
  "openai:o3-mini": {
    id: "openai:o3-mini",
    provider: "openai",
    name: "o3-mini",
    description: "Latest reasoning model",
    contextWindow: 200000,
    pricing: { input: 1.1, output: 4.4, reasoning: 1.1 },
    capabilities: ["thinking"],
    supportsThinkingEffort: true,
  },

  // Anthropic
  "anthropic:claude-4.5-opus": {
    id: "anthropic:claude-4.5-opus",
    provider: "anthropic",
    name: "Claude 4.5 Opus",
    description: "Most capable Claude",
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0, cached: 1.5 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },
  "anthropic:claude-4.5-sonnet": {
    id: "anthropic:claude-4.5-sonnet",
    provider: "anthropic",
    name: "Claude 4.5 Sonnet",
    description: "Balanced performance",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0, cached: 0.3 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },
  "anthropic:claude-4.5-haiku": {
    id: "anthropic:claude-4.5-haiku",
    provider: "anthropic",
    name: "Claude 4.5 Haiku",
    description: "Fast and affordable",
    contextWindow: 200000,
    pricing: { input: 0.8, output: 4.0, cached: 0.08 },
    capabilities: ["vision"],
  },

  // Google
  "google:gemini-2.5-flash": {
    id: "google:gemini-2.5-flash",
    provider: "google",
    name: "Gemini 2.5 Flash",
    description: "Fast multimodal",
    contextWindow: 1000000,
    pricing: { input: 0.3, output: 1.2, cached: 0.075 },
    capabilities: ["vision", "function-calling"],
  },
  "google:gemini-2.5-pro": {
    id: "google:gemini-2.5-pro",
    provider: "google",
    name: "Gemini 2.5 Pro",
    description: "Most capable Gemini",
    contextWindow: 2000000,
    pricing: { input: 2.5, output: 10.0, cached: 0.625 },
    capabilities: ["vision", "function-calling", "thinking"],
  },
  "google:gemini-3-pro": {
    id: "google:gemini-3-pro",
    provider: "google",
    name: "Gemini 3 Pro",
    description: "Next-gen reasoning",
    contextWindow: 2000000,
    pricing: { input: 5.0, output: 15.0, cached: 1.25 },
    capabilities: ["vision", "function-calling", "thinking"],
  },

  // xAI
  "xai:grok-4": {
    id: "xai:grok-4",
    provider: "xai",
    name: "Grok 4",
    description: "Advanced reasoning",
    contextWindow: 128000,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ["thinking"],
  },
  "xai:grok-4-fast": {
    id: "xai:grok-4-fast",
    provider: "xai",
    name: "Grok 4 Fast",
    description: "Free on OpenRouter",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: [],
  },
  "xai:grok-4.1-fast": {
    id: "xai:grok-4.1-fast",
    provider: "xai",
    name: "Grok 4.1 Fast",
    description: "Faster iteration",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: [],
  },

  // Perplexity
  "perplexity:sonar": {
    id: "perplexity:sonar",
    provider: "perplexity",
    name: "Sonar",
    description: "Real-time search integration",
    contextWindow: 127000,
    pricing: { input: 1.0, output: 1.0 },
    capabilities: [],
  },
};

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIG[modelId];
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
  const cachedCost = ((usage.cachedTokens || 0) / 1_000_000) * (config.pricing.cached || 0);
  const reasoningCost = ((usage.reasoningTokens || 0) / 1_000_000) * (config.pricing.reasoning || 0);

  return inputCost + outputCost + cachedCost + reasoningCost;
}

export function isValidModel(modelId: string): boolean {
  return modelId in MODEL_CONFIG;
}
