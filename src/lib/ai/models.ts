import type { ReasoningConfig } from "./reasoning/types";

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
    | "groq"
    | "cerebras"
    | "minimax"
    | "deepseek"
    | "kimi"
    | "zai"
    | "meta";
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
    | "image-generation"
  )[];
  isLocal?: boolean;
  actualModelId?: string;
  reasoning?: ReasoningConfig;
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
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
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
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
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
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
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
    capabilities: [
      "vision",
      "function-calling",
      "thinking",
      "extended-thinking",
    ],
    reasoning: {
      type: "anthropic-extended-thinking",
      budgetMapping: { low: 5000, medium: 15000, high: 30000 },
      betaHeader: "interleaved-thinking-2025-05-14",
    },
  },
  "anthropic:claude-sonnet-4-5-20250929": {
    id: "anthropic:claude-sonnet-4-5-20250929",
    provider: "anthropic",
    name: "Claude 4.5 Sonnet",
    description: "Balanced performance and speed",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0, cached: 0.3 },
    capabilities: [
      "vision",
      "function-calling",
      "thinking",
      "extended-thinking",
    ],
    reasoning: {
      type: "anthropic-extended-thinking",
      budgetMapping: { low: 5000, medium: 15000, high: 30000 },
      betaHeader: "interleaved-thinking-2025-05-14",
    },
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
  "google:gemini-2.5-flash": {
    id: "google:gemini-2.5-flash",
    provider: "google",
    name: "Gemini 2.5 Flash",
    description:
      "Production model with thinking - fast, multimodal, 1M context",
    contextWindow: 1048576,
    pricing: {
      input: 0.15,
      output: 0.6,
      cached: 0.019,
      reasoning: 3.5, // Thinking output pricing (6x higher!)
    },
    capabilities: ["vision", "function-calling", "thinking"],
    reasoning: {
      type: "google-thinking-budget",
      budgetMapping: {
        low: 4096,
        medium: 12288,
        high: 24576,
      },
    },
  },
  "google:gemini-2.5-pro": {
    id: "google:gemini-2.5-pro",
    provider: "google",
    name: "Gemini 2.5 Pro",
    description:
      "Most capable with extended thinking - 2M context, best quality",
    contextWindow: 2097152,
    pricing: {
      input: 1.25,
      output: 5.0,
      cached: 0.31,
    },
    capabilities: ["vision", "function-calling", "thinking"],
    reasoning: {
      type: "google-thinking-budget",
      budgetMapping: {
        low: 8192,
        medium: 16384,
        high: 24576,
      },
    },
  },
  "google:gemini-2.0-flash": {
    id: "google:gemini-2.0-flash",
    provider: "google",
    name: "Gemini 2.0 Flash",
    description: "Stable multimodal - fast, cost-effective, no thinking",
    contextWindow: 1048576,
    pricing: {
      input: 0.075,
      output: 0.3,
      cached: 0.019,
    },
    capabilities: ["vision", "function-calling"],
  },
  "google:gemini-2.0-flash-lite": {
    id: "google:gemini-2.0-flash-lite",
    provider: "google",
    name: "Gemini 2.0 Flash Lite",
    description: "Ultra-cost-optimized - fastest, cheapest, no thinking",
    contextWindow: 1048576,
    pricing: {
      input: 0.0375,
      output: 0.15,
      cached: 0.0095,
    },
    capabilities: ["vision", "function-calling"],
  },
  "google:gemini-2.0-flash-exp": {
    id: "google:gemini-2.0-flash-exp",
    provider: "google",
    name: "Gemini 2.0 Flash (Experimental)",
    description: "Experimental generation - for image/video/audio",
    contextWindow: 1048576,
    pricing: { input: 0, output: 0 },
    capabilities: ["vision"],
  },

  "google:gemini-3-pro": {
    id: "google:gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "google",
    contextWindow: 1048576, // 1M tokens
    pricing: {
      input: 2.0, // $2/MTok (≤200K context)
      output: 12.0, // $12/MTok (≤200K context)
      // Note: >200K is $4/$24 but flat pricing doesn't support tiering
    },
    capabilities: ["function-calling", "thinking"],
    description: "Third-generation flagship model with advanced reasoning",
    reasoning: {
      type: "google-thinking-level",
      levelMapping: {
        low: "low",
        medium: "medium",
        high: "high",
      },
      includeThoughts: true,
    },
  },

  "google:gemini-3-pro-image-preview": {
    id: "google:gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image (Nano Banana Pro)",
    provider: "google",
    contextWindow: 65536, // 65K tokens
    pricing: {
      input: 0.0, // Preview pricing - TBD
      output: 0.0,
    },
    capabilities: ["image-generation", "vision", "thinking"],
    description:
      "Image generation model with advanced visual understanding and reasoning (marketing name: Nano Banana Pro)",
    reasoning: {
      type: "google-thinking-level",
      levelMapping: {
        low: "low",
        medium: "medium",
        high: "high",
      },
      includeThoughts: true,
    },
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
  "xai:grok-3-mini": {
    id: "xai:grok-3-mini",
    provider: "xai",
    name: "Grok 3 Mini",
    description: "Fast reasoning model with effort control",
    contextWindow: 128000,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ["thinking"],
    reasoning: {
      type: "generic-reasoning-effort",
      parameterName: "reasoning_effort",
    },
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
  // Meta Models (via Vercel AI Gateway)
  "meta:llama-3.3-70b": {
    id: "meta:llama-3.3-70b",
    provider: "meta",
    name: "Llama 3.3 70B",
    description: "Enhanced reasoning, tool use, multilingual. 128K context.",
    contextWindow: 128000,
    pricing: { input: 0.59, output: 0.79 },
    capabilities: ["function-calling"],
  },

  // OpenRouter Top Picks
  "openrouter:deepseek-v3": {
    id: "openrouter:deepseek-v3",
    provider: "openrouter",
    name: "DeepSeek v3",
    description: "Top-tier coding and reasoning",
    contextWindow: 128000,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ["thinking"],
    reasoning: {
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    },
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


  "cerebras:gpt-oss-120b": {
    id: "cerebras:gpt-oss-120b",
    provider: "cerebras",
    name: "GPT-OSS 120B",
    description: "Fastest model available. ~3,000 tok/s. Production.",
    contextWindow: 8192,
    pricing: { input: 0.35, output: 0.75 },
    capabilities: ["function-calling"],
  },
  "cerebras:qwen-3-32b": {
    id: "cerebras:qwen-3-32b",
    provider: "cerebras",
    name: "Qwen 3 32B",
    description: "Efficient 32B model. ~2,600 tok/s. Production.",
    contextWindow: 8192,
    pricing: { input: 0.4, output: 0.8 },
    capabilities: ["function-calling"],
  },
  "cerebras:qwen-3-235b-a22b-instruct-2507": {
    id: "cerebras:qwen-3-235b-a22b-instruct-2507",
    provider: "cerebras",
    name: "Qwen 3 235B Instruct",
    description: "Large instruct model. ~1,400 tok/s. Preview.",
    contextWindow: 8192,
    pricing: { input: 0.6, output: 1.2 },
    capabilities: ["function-calling"],
  },
  "cerebras:qwen-3-235b-a22b-thinking-2507": {
    id: "cerebras:qwen-3-235b-a22b-thinking-2507",
    provider: "cerebras",
    name: "Qwen 3 235B Thinking",
    description: "Reasoning model with native thinking. ~1,000 tok/s. Preview.",
    contextWindow: 8192,
    pricing: { input: 0.6, output: 1.2 },
    capabilities: ["function-calling", "thinking"],
    reasoning: {
      type: "generic-reasoning-effort",
      parameterName: "reasoning_level",
    },
  },

  // Z.AI Models
  "zai:glm-4.6": {
    id: "zai:glm-4.6",
    provider: "zai",
    name: "GLM 4.6",
    description: "Z.ai flagship. Coding, reasoning, agents. 200K context.",
    contextWindow: 200000,
    pricing: { input: 0.45, output: 1.8 },
    capabilities: ["function-calling"],
  },

  // MiniMax Models
  "minimax:m2": {
    id: "minimax:m2",
    provider: "minimax",
    name: "MiniMax M2",
    description: "230B MoE (10B active). Best value for coding & agents.",
    contextWindow: 204800,
    pricing: { input: 0.3, output: 1.2 },
    capabilities: ["vision", "function-calling"],
  },

  // DeepSeek Models
  "deepseek:deepseek-r1": {
    id: "deepseek:deepseek-r1",
    provider: "deepseek",
    name: "DeepSeek R1",
    description: "671B MoE reasoning model. Extended thinking.",
    contextWindow: 128000,
    pricing: { input: 0.55, output: 2.19 },
    capabilities: ["thinking", "function-calling"],
    reasoning: {
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    },
  },

  // Kimi Models
  "kimi:kimi-k2-thinking": {
    id: "kimi:kimi-k2-thinking",
    provider: "kimi",
    name: "Kimi K2 Thinking",
    description: "1T MoE (32B active). 256K context with deep reasoning.",
    contextWindow: 256000,
    pricing: { input: 0.6, output: 2.4 },
    capabilities: ["thinking", "function-calling"],
  },
};

// Migration map: old model IDs → new model IDs (vendor prefixes added)
const MODEL_ID_MIGRATIONS: Record<string, string> = {
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
  "openrouter:llama-4-maverick": "meta:llama-3.3-70b",
  "openrouter:llama-4-behemoth": "meta:llama-3.3-70b",
  // Redirect removed Groq models to Cerebras equivalents (via Gateway)
  "groq:openai/gpt-oss-120b": "cerebras:gpt-oss-120b",
  "groq:gpt-oss-120b": "cerebras:gpt-oss-120b",
  "groq:qwen/qwen3-32b": "cerebras:qwen-3-32b",
  "groq:qwen-qwen3-32b": "cerebras:qwen-3-32b",
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
