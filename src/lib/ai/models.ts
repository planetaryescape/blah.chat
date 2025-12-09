import type { ReasoningConfig } from "./reasoning/types";

export interface ModelConfig {
  id: string;
  provider:
    | "openai"
    | "anthropic"
    | "google"
    | "xai"
    | "perplexity"
    | "groq"
    | "cerebras"
    | "minimax"
    | "deepseek"
    | "kimi"
    | "zai"
    | "meta"
    | "mistral"
    | "alibaba"
    | "zhipu";
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
  /** Fallback provider order for gateway routing (e.g., ["cerebras", "groq"]) */
  providerOrder?: string[];
  /** Mark preview/beta/experimental models */
  isExperimental?: boolean;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // OpenAI

  /* "openai:gpt-5-pro": {
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
  }, */
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
  "openai:gpt-4.1-mini": {
    id: "openai:gpt-4.1-mini",
    provider: "openai",
    name: "GPT-4.1 Mini",
    description: "Smartest non-reasoning model - compact variant",
    contextWindow: 1000000,
    pricing: { input: 0.4, output: 1.6, cached: 0.1 },
    capabilities: ["vision", "function-calling"],
  },

  // Anthropic
  "anthropic:claude-opus-4.5": {
    id: "anthropic:claude-opus-4.5",
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
  "anthropic:claude-sonnet-4.5": {
    id: "anthropic:claude-sonnet-4.5",
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
  "anthropic:claude-haiku-4.5": {
    id: "anthropic:claude-haiku-4.5",
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
    isExperimental: true,
  },

  "google:gemini-3-pro-preview": {
    id: "google:gemini-3-pro-preview",
    name: "Gemini 3 Pro (Preview)",
    provider: "google",
    contextWindow: 1048576, // 1M tokens
    pricing: {
      input: 2.0, // $2/MTok (≤200K context)
      output: 12.0, // $12/MTok (≤200K context)
      // Note: >200K is $4/$24 but flat pricing doesn't support tiering
    },
    capabilities: ["function-calling", "thinking"],
    description: "Third-generation flagship model with advanced reasoning (experimental)",
    isExperimental: true,
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

  "google:gemini-3-pro-image": {
    id: "google:gemini-3-pro-image",
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
    isExperimental: true,
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

  // xAI - Note: Vercel AI Gateway uses "xai/model-name" format
  "xai:grok-4-fast": {
    id: "xai:grok-4-fast",
    provider: "xai",
    name: "Grok 4 Fast",
    description: "Faster Grok 4 variant (non-reasoning)",
    contextWindow: 256000,
    pricing: { input: 2.0, output: 8.0 },
    capabilities: ["function-calling"],
    actualModelId: "grok-4-fast-non-reasoning",
  },

  "xai:grok-4.1-fast": {
    id: "xai:grok-4.1-fast",
    provider: "xai",
    name: "Grok 4.1 Fast",
    description: "Best agentic tool-calling model (non-reasoning)",
    contextWindow: 2000000,
    pricing: { input: 1.0, output: 4.0 },
    capabilities: ["function-calling"],
    actualModelId: "grok-4.1-fast-non-reasoning",
  },
  "xai:grok-4.1-fast-reasoning": {
    id: "xai:grok-4.1-fast-reasoning",
    provider: "xai",
    name: "Grok 4.1 Fast (Reasoning)",
    description: "Best agentic tool-calling model with reasoning",
    contextWindow: 2000000,
    pricing: { input: 1.0, output: 4.0 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "grok-4.1-fast-reasoning",
  },
  "xai:grok-code-fast-1": {
    id: "xai:grok-code-fast-1",
    provider: "xai",
    name: "Grok Code Fast",
    description: "Speedy reasoning for coding",
    contextWindow: 128000,
    pricing: { input: 0.5, output: 2.0 },
    capabilities: ["thinking"],
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
    providerOrder: ["cerebras", "groq"],
  },
  "meta:llama-4-maverick": {
    id: "meta:llama-4-maverick",
    provider: "meta",
    name: "Llama 4 Maverick 17B",
    description: "Llama 4's largest MoE model with coding, reasoning, and image capabilities.",
    contextWindow: 128000,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: ["vision", "function-calling"],
    providerOrder: ["cerebras", "groq"],
  },
  "meta:llama-4-scout": {
    id: "meta:llama-4-scout",
    provider: "meta",
    name: "Llama 4 Scout 17B",
    description: "Smaller Llama 4 MoE. Fast and efficient for general tasks.",
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.3 },
    capabilities: ["function-calling"],
    providerOrder: ["cerebras", "groq"],
  },

  // Mistral Models (via Vercel AI Gateway)
  "mistral:devstral-small": {
    id: "mistral:devstral-small",
    provider: "mistral",
    name: "Mistral Devstral Small",
    description: "Agentic LLM optimized for software engineering tasks.",
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.3 },
    capabilities: ["function-calling"],
  },

  // Alibaba Qwen Models (via Vercel AI Gateway)
  "alibaba:qwen3-coder-480b": {
    id: "alibaba:qwen3-coder-480b",
    provider: "alibaba",
    name: "Qwen 3 Coder 480B",
    description: "480B MoE coding specialist optimized for agentic tasks.",
    contextWindow: 131072,
    pricing: { input: 0.35, output: 1.4 },
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
    providerOrder: ["groq", "cerebras"],
  },
  "groq:groq/compound": {
    id: "groq:groq/compound",
    provider: "groq",
    name: "Groq Compound",
    description: "Multi-tool agentic system (web + code)",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: ["function-calling"],
    isExperimental: true,
  },
  "groq:groq/compound-mini": {
    id: "groq:groq/compound-mini",
    provider: "groq",
    name: "Groq Compound Mini",
    description: "Single-tool agentic (3x faster)",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: ["function-calling"],
    isExperimental: true,
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


  // OpenAI OSS Models (via Gateway)
  "openai:gpt-oss-120b": {
    id: "openai:gpt-oss-120b",
    provider: "openai",
    name: "GPT-OSS 120B",
    description: "Extremely capable general-purpose LLM with strong reasoning.",
    contextWindow: 128000,
    pricing: { input: 0.35, output: 0.75 },
    capabilities: ["function-calling", "thinking"],
    providerOrder: ["cerebras", "groq"],
  },
  "cerebras:qwen-3-32b": {
    id: "cerebras:qwen-3-32b",
    provider: "cerebras",
    name: "Qwen 3 32B",
    description: "Efficient 32B model. ~2,600 tok/s. Production.",
    contextWindow: 131072,
    pricing: { input: 0.4, output: 0.8 },
    capabilities: ["function-calling"],
    providerOrder: ["cerebras", "groq"],
  },
  "cerebras:qwen-3-235b-a22b-instruct-2507": {
    id: "cerebras:qwen-3-235b-a22b-instruct-2507",
    provider: "cerebras",
    name: "Qwen 3 235B Instruct",
    description: "Large instruct model. ~1,400 tok/s. Preview.",
    contextWindow: 131072,
    pricing: { input: 0.6, output: 1.2 },
    capabilities: ["function-calling"],
  },
  "cerebras:qwen-3-235b-a22b-thinking-2507": {
    id: "cerebras:qwen-3-235b-a22b-thinking-2507",
    provider: "cerebras",
    name: "Qwen 3 235B Thinking",
    description: "Reasoning model with native thinking. ~1,000 tok/s. Preview.",
    contextWindow: 131072,
    pricing: { input: 0.6, output: 1.2 },
    capabilities: ["function-calling", "thinking"],
    reasoning: {
      type: "generic-reasoning-effort",
      parameterName: "reasoning_level",
    },
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
    providerOrder: ["cerebras", "groq"],
    reasoning: {
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    },
  },
  "deepseek:deepseek-v3.2": {
    id: "deepseek:deepseek-v3.2",
    provider: "deepseek",
    name: "DeepSeek V3.2",
    description: "Official successor to V3.2-Exp. Combined thinking + tool use.",
    contextWindow: 128000,
    pricing: { input: 0.27, output: 1.1 },
    capabilities: ["thinking", "function-calling"],
    reasoning: {
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    },
  },
  "deepseek:deepseek-v3.2-thinking": {
    id: "deepseek:deepseek-v3.2-thinking",
    provider: "deepseek",
    name: "DeepSeek V3.2 Thinking",
    description: "Thinking mode of DeepSeek V3.2 for complex reasoning.",
    contextWindow: 128000,
    pricing: { input: 0.27, output: 1.1 },
    capabilities: ["thinking"],
    reasoning: {
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    },
  },

};


