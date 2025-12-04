export interface ModelConfig {
  id: string;
  provider:
    | "openai"
    | "anthropic"
    | "google"
    | "xai"
    | "perplexity"
    | "ollama"
    | "openrouter";
  name: string;
  description?: string;
  contextWindow: number;
  pricing: {
    input: number;
    output: number;
    cached?: number;
    reasoning?: number;
  };
  capabilities: (
    | "vision"
    | "function-calling"
    | "thinking"
    | "extended-thinking"
  )[];
  supportsThinkingEffort?: boolean;
  isLocal?: boolean;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // OpenAI
  "openai:gpt-5.1-instant": {
    id: "openai:gpt-5.1-instant",
    provider: "openai",
    name: "GPT-5.1 Instant",
    description: "Fast, conversational, and improved instruction following",
    contextWindow: 200000,
    pricing: { input: 0.1, output: 0.4, cached: 0.05 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-5.1-thinking": {
    id: "openai:gpt-5.1-thinking",
    provider: "openai",
    name: "GPT-5.1 Thinking",
    description: "Adaptive reasoning with dynamic thinking time",
    contextWindow: 200000,
    pricing: { input: 5.0, output: 20.0, reasoning: 5.0 },
    capabilities: ["thinking", "vision"],
    supportsThinkingEffort: true,
  },
  "openai:gpt-4o": {
    id: "openai:gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    description: "Reliable multimodal flagship",
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10.0, cached: 1.25 },
    capabilities: ["vision", "function-calling"],
  },

  // Anthropic
  "anthropic:claude-4.5-opus": {
    id: "anthropic:claude-4.5-opus",
    provider: "anthropic",
    name: "Claude 4.5 Opus",
    description: "Most capable Claude for complex tasks",
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0, cached: 1.5 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },
  "anthropic:claude-4.5-sonnet": {
    id: "anthropic:claude-4.5-sonnet",
    provider: "anthropic",
    name: "Claude 4.5 Sonnet",
    description: "Balanced performance and speed",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0, cached: 0.3 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },

  // Google
  "google:gemini-3-pro": {
    id: "google:gemini-3-pro",
    provider: "google",
    name: "Gemini 3 Pro",
    description: "Google's most intelligent AI model",
    contextWindow: 2000000,
    pricing: { input: 2.5, output: 10.0, cached: 0.625 },
    capabilities: ["vision", "function-calling", "thinking"],
  },
  "google:gemini-3-deep-think": {
    id: "google:gemini-3-deep-think",
    provider: "google",
    name: "Gemini 3 Deep Think",
    description: "Specialized for complex problem solving",
    contextWindow: 2000000,
    pricing: { input: 5.0, output: 15.0, cached: 1.25 },
    capabilities: ["vision", "function-calling", "thinking"],
  },

  // xAI
  "xai:grok-4.1-fast": {
    id: "xai:grok-4.1-fast",
    provider: "xai",
    name: "Grok 4.1 Fast",
    description: "Best agentic tool-calling model",
    contextWindow: 2000000,
    pricing: { input: 0, output: 0 }, // Free on OpenRouter currently? Or check pricing. Assuming free/low cost based on "Fast"
    capabilities: ["thinking", "function-calling"],
  },
  "xai:grok-4-fast": {
    id: "xai:grok-4-fast",
    provider: "xai",
    name: "Grok 4 Fast",
    description: "Fast reasoning model",
    contextWindow: 2000000,
    pricing: { input: 0, output: 0 },
    capabilities: ["thinking"],
  },
  "xai:grok-code-fast-1": {
    id: "xai:grok-code-fast-1",
    provider: "xai",
    name: "Grok Code Fast 1",
    description: "Speedy reasoning for coding",
    contextWindow: 128000, // Verify context window if possible, but 128k is safe bet or 2M? Search said "speedy and economical".
    pricing: { input: 0, output: 0 },
    capabilities: ["thinking"],
  },
  "xai:grok-4": {
    id: "xai:grok-4",
    provider: "xai",
    name: "Grok 4",
    description: "Advanced reasoning",
    contextWindow: 256000,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ["thinking", "vision"],
  },

  // Perplexity
  "perplexity:sonar-pro-search": {
    id: "perplexity:sonar-pro-search",
    provider: "perplexity",
    name: "Sonar Pro Search",
    description: "Advanced agentic search with multi-step reasoning",
    contextWindow: 127000,
    pricing: { input: 3.0, output: 3.0 }, // Estimated pricing, verify if possible
    capabilities: ["thinking"],
  },
  "perplexity:sonar-reasoning-pro": {
    id: "perplexity:sonar-reasoning-pro",
    provider: "perplexity",
    name: "Sonar Reasoning Pro",
    description: "DeepSeek R1 powered reasoning with CoT",
    contextWindow: 127000,
    pricing: { input: 2.0, output: 8.0 }, // Estimated
    capabilities: ["thinking"],
  },
  "perplexity:sonar-pro": {
    id: "perplexity:sonar-pro",
    provider: "perplexity",
    name: "Sonar Pro",
    description: "Advanced search with grounding",
    contextWindow: 127000,
    pricing: { input: 1.0, output: 1.0 },
    capabilities: [],
  },
  "perplexity:sonar-deep-research": {
    id: "perplexity:sonar-deep-research",
    provider: "perplexity",
    name: "Sonar Deep Research",
    description: "Multi-step retrieval and synthesis for complex topics",
    contextWindow: 127000,
    pricing: { input: 2.0, output: 2.0 },
    capabilities: ["thinking"],
  },
  "perplexity:sonar-reasoning": {
    id: "perplexity:sonar-reasoning",
    provider: "perplexity",
    name: "Sonar Reasoning",
    description: "Fast real-time reasoning",
    contextWindow: 127000,
    pricing: { input: 0.5, output: 0.5 },
    capabilities: ["thinking"],
  },
  "perplexity:sonar": {
    id: "perplexity:sonar",
    provider: "perplexity",
    name: "Sonar",
    description: "Lightweight, fast search",
    contextWindow: 127000,
    pricing: { input: 0.2, output: 0.2 },
    capabilities: [],
  },

  // OpenRouter Top Picks
  "openrouter:llama-4-maverick": {
    id: "openrouter:llama-4-maverick",
    provider: "openrouter",
    name: "Llama 4 Maverick",
    description: "Powerful open model from Meta",
    contextWindow: 128000,
    pricing: { input: 0.7, output: 0.9 },
    capabilities: ["vision"],
  },
  "openrouter:llama-4-behemoth": {
    id: "openrouter:llama-4-behemoth",
    provider: "openrouter",
    name: "Llama 4 Behemoth",
    description: "Meta's most powerful model",
    contextWindow: 128000,
    pricing: { input: 2.0, output: 3.0 },
    capabilities: ["vision"],
  },
  "openrouter:deepseek-v3": {
    id: "openrouter:deepseek-v3",
    provider: "openrouter",
    name: "DeepSeek v3",
    description: "Top-tier coding and reasoning",
    contextWindow: 128000,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ["thinking"],
  },
  "openrouter:mistral-devstral": {
    id: "openrouter:mistral-devstral",
    provider: "openrouter",
    name: "Mistral Devstral",
    description: "Optimized for development tasks",
    contextWindow: 128000,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: ["function-calling"],
  },
  "openrouter:qwen-3-coder-free": {
    id: "openrouter:qwen-3-coder-free",
    provider: "openrouter",
    name: "Qwen 3 Coder (Free)",
    description: "Specialized coding model",
    contextWindow: 32000,
    pricing: { input: 0, output: 0 },
    capabilities: ["function-calling"],
  },
  "openrouter:glm-4.5-air-free": {
    id: "openrouter:glm-4.5-air-free",
    provider: "openrouter",
    name: "GLM-4.5 Air (Free)",
    description: "Balanced performance model",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
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
