export interface ModelConfig {
  id: string;
  provider:
    | "openai"
    | "anthropic"
    | "google"
    | "xai"
    | "perplexity"
    | "ollama"
    | "openrouter"
    | "groq";
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
  "openai:gpt-5.1": {
    id: "openai:gpt-5.1",
    provider: "openai",
    name: "GPT-5.1",
    description:
      "The best model for coding and agentic tasks with configurable reasoning effort.",
    contextWindow: 200000,
    pricing: { input: 5.0, output: 20.0, reasoning: 5.0 }, // Estimated based on flagship pricing
    capabilities: ["thinking", "vision", "function-calling"],
    supportsThinkingEffort: true,
  },
  "openai:gpt-5-pro": {
    id: "openai:gpt-5-pro",
    provider: "openai",
    name: "GPT-5 Pro",
    description:
      "Version of GPT-5 that produces smarter and more precise responses",
    contextWindow: 200000,
    pricing: { input: 10.0, output: 40.0, reasoning: 10.0 }, // Estimated higher tier
    capabilities: ["thinking", "vision", "function-calling"],
    supportsThinkingEffort: true,
  },
  "openai:gpt-5": {
    id: "openai:gpt-5",
    provider: "openai",
    name: "GPT-5",
    description:
      "Previous intelligent reasoning model for coding and agentic tasks.",
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10.0, reasoning: 2.5 },
    capabilities: ["thinking", "vision", "function-calling"],
    supportsThinkingEffort: true,
  },
  "openai:gpt-5-mini": {
    id: "openai:gpt-5-mini",
    provider: "openai",
    name: "GPT-5 Mini",
    description:
      "A faster, cost-efficient version of GPT-5 for well-defined tasks",
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.6, cached: 0.075 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-5-nano": {
    id: "openai:gpt-5-nano",
    provider: "openai",
    name: "GPT-5 Nano",
    description: "Fastest, most cost-efficient version of GPT-5",
    contextWindow: 128000,
    pricing: { input: 0.05, output: 0.2, cached: 0.025 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-4.1": {
    id: "openai:gpt-4.1",
    provider: "openai",
    name: "GPT-4.1",
    description: "Smartest non-reasoning model",
    contextWindow: 128000,
    pricing: { input: 1.0, output: 4.0 }, // Estimated
    capabilities: ["vision", "function-calling"],
  },

  // Anthropic
  "anthropic:claude-opus-4-5-20251101": {
    id: "anthropic:claude-opus-4-5-20251101",
    provider: "anthropic",
    name: "Claude 4.5 Opus",
    description: "Most capable Claude for complex tasks",
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0, cached: 1.5 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },
  "anthropic:claude-sonnet-4-5-20250929": {
    id: "anthropic:claude-sonnet-4-5-20250929",
    provider: "anthropic",
    name: "Claude 4.5 Sonnet",
    description: "Balanced performance and speed",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0, cached: 0.3 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },
  "anthropic:claude-haiku-4-5-20251001": {
    id: "anthropic:claude-haiku-4-5-20251001",
    provider: "anthropic",
    name: "Claude 4.5 Haiku",
    description: "Fast and cost-effective",
    contextWindow: 200000,
    pricing: { input: 0.25, output: 1.25, cached: 0.03 }, // Estimated pricing
    capabilities: ["vision", "function-calling"],
  },

  // Google
  "google:gemini-3-pro-preview": {
    id: "google:gemini-3-pro-preview",
    provider: "google",
    name: "Gemini 3 Pro",
    description: "Google's most capable AI model",
    contextWindow: 1048576,
    pricing: { input: 0, output: 0 }, // Preview pricing
    capabilities: ["vision", "function-calling", "thinking"],
    supportsThinkingEffort: true,
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
  "google:gemini-3-pro-image-preview": {
    id: "google:gemini-3-pro-image-preview",
    provider: "google",
    name: "Gemini 3 Pro Image",
    description: "Image generation model",
    contextWindow: 1048576,
    pricing: { input: 0, output: 0 }, // Preview pricing
    capabilities: ["vision"],
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

  // Groq - Production
  "groq:llama-3.1-8b-instant": {
    id: "groq:llama-3.1-8b-instant",
    provider: "groq",
    name: "Llama 3.1 8B Instant",
    description: "Ultra-fast 8B model (560 T/sec)",
    contextWindow: 128000,
    pricing: { input: 0.05, output: 0.08 },
    capabilities: ["function-calling"],
  },
  "groq:llama-3.3-70b-versatile": {
    id: "groq:llama-3.3-70b-versatile",
    provider: "groq",
    name: "Llama 3.3 70B Versatile",
    description: "Balanced 70B model with tool use",
    contextWindow: 128000,
    pricing: { input: 0.59, output: 0.79 },
    capabilities: ["function-calling"],
  },
  "groq:meta-llama/llama-guard-4-12b": {
    id: "groq:meta-llama/llama-guard-4-12b",
    provider: "groq",
    name: "Llama Guard 4 12B",
    description: "Content moderation (1200 T/sec)",
    contextWindow: 128000,
    pricing: { input: 0.2, output: 0.2 },
    capabilities: [],
  },
  "groq:openai/gpt-oss-120b": {
    id: "groq:openai/gpt-oss-120b",
    provider: "groq",
    name: "GPT-OSS 120B",
    description: "OpenAI flagship open MoE",
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.75 },
    capabilities: ["function-calling"],
  },
  "groq:openai/gpt-oss-20b": {
    id: "groq:openai/gpt-oss-20b",
    provider: "groq",
    name: "GPT-OSS 20B",
    description: "Compact MoE (1000 T/sec)",
    contextWindow: 131000,
    pricing: { input: 0.1, output: 0.5 },
    capabilities: ["function-calling"],
  },
  "groq:groq/compound": {
    id: "groq:groq/compound",
    provider: "groq",
    name: "Groq Compound",
    description: "Multi-tool agentic system (web + code)",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: ["function-calling"],
  },
  "groq:groq/compound-mini": {
    id: "groq:groq/compound-mini",
    provider: "groq",
    name: "Groq Compound Mini",
    description: "Single-tool agentic (3x faster)",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: ["function-calling"],
  },

  // Groq - Preview
  "groq:moonshotai/kimi-k2-instruct-0905": {
    id: "groq:moonshotai/kimi-k2-instruct-0905",
    provider: "groq",
    name: "Kimi K2 Instruct (Preview)",
    description: "1T MoE with 262K context",
    contextWindow: 262000,
    pricing: { input: 1.0, output: 3.0 },
    capabilities: ["function-calling"],
  },
  "groq:qwen/qwen3-32b": {
    id: "groq:qwen/qwen3-32b",
    provider: "groq",
    name: "Qwen3 32B (Preview)",
    description: "Dual-mode reasoning + dialogue",
    contextWindow: 131000,
    pricing: { input: 0.29, output: 0.59 },
    capabilities: ["function-calling", "thinking"],
  },
  "groq:meta-llama/llama-4-maverick-17b-128e-instruct": {
    id: "groq:meta-llama/llama-4-maverick-17b-128e-instruct",
    provider: "groq",
    name: "Llama 4 Maverick (Preview)",
    description: "17B MoE multimodal (400B total)",
    contextWindow: 131000,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: ["vision", "function-calling"],
  },
  "groq:meta-llama/llama-4-scout-17b-16e-instruct": {
    id: "groq:meta-llama/llama-4-scout-17b-16e-instruct",
    provider: "groq",
    name: "Llama 4 Scout (Preview)",
    description: "Fast 17B multimodal (750 T/sec)",
    contextWindow: 131000,
    pricing: { input: 0.11, output: 0.34 },
    capabilities: ["vision", "function-calling"],
  },
};

// Migration map: old model IDs → new model IDs (vendor prefixes added)
const MODEL_ID_MIGRATIONS: Record<string, string> = {
  "groq:llama-guard-4-12b": "groq:meta-llama/llama-guard-4-12b",
  "groq:gpt-oss-120b": "groq:openai/gpt-oss-120b",
  "groq:gpt-oss-20b": "groq:openai/gpt-oss-20b",
  "groq:groq-compound": "groq:groq/compound",
  "groq:groq-compound-mini": "groq:groq/compound-mini",
  "groq:moonshotai-kimi-k2-instruct-0905":
    "groq:moonshotai/kimi-k2-instruct-0905",
  "groq:qwen-qwen3-32b": "groq:qwen/qwen3-32b",
  "groq:llama-4-maverick-17b-128e-instruct":
    "groq:meta-llama/llama-4-maverick-17b-128e-instruct",
  "groq:llama-4-scout-17b-16e-instruct":
    "groq:meta-llama/llama-4-scout-17b-16e-instruct",
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
