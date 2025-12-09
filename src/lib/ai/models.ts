import type { ProviderName } from "./providers";
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
  /** Knowledge cutoff date for the model (e.g., "November 2025", "Real-time search") */
  knowledgeCutoff?: string;
  /** Preferred provider SDK to use. Defaults to "gateway" (Vercel AI Gateway) */
  preferredProvider?: ProviderName;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // OpenAI

  // GPT-5.1 Family (November 2025)
  "openai:gpt-5.1": {
    id: "openai:gpt-5.1",
    provider: "openai",
    name: "GPT-5.1",
    description:
      "Latest flagship with adaptive reasoning and 24h prompt caching",
    contextWindow: 256000,
    pricing: { input: 1.25, output: 10.0, cached: 0.125 },
    capabilities: ["thinking", "vision", "function-calling"],
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
    knowledgeCutoff: "November 2025",
  },
  "openai:gpt-5.1-mini": {
    id: "openai:gpt-5.1-mini",
    provider: "openai",
    name: "GPT-5.1 Mini",
    description: "Compact variant of GPT-5.1 for cost-efficient tasks",
    contextWindow: 128000,
    pricing: { input: 0.25, output: 2.0, cached: 0.025 },
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "November 2025",
  },
  "openai:gpt-5.1-nano": {
    id: "openai:gpt-5.1-nano",
    provider: "openai",
    name: "GPT-5.1 Nano",
    description: "Smallest, fastest GPT-5.1 variant",
    contextWindow: 128000,
    pricing: { input: 0.05, output: 0.4, cached: 0.005 },
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "November 2025",
  },
  "openai:gpt-5.1-codex": {
    id: "openai:gpt-5.1-codex",
    provider: "openai",
    name: "GPT-5.1 Codex",
    description: "GPT-5.1 optimized for agentic coding tasks",
    contextWindow: 256000,
    pricing: { input: 1.25, output: 10.0, cached: 0.125 },
    capabilities: ["thinking", "function-calling"],
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
    knowledgeCutoff: "November 2025",
  },
  "openai:gpt-5.1-thinking": {
    id: "openai:gpt-5.1-thinking",
    provider: "openai",
    name: "GPT-5.1 Thinking",
    description: "Extended thinking mode for complex multi-step reasoning",
    contextWindow: 256000,
    pricing: { input: 1.25, output: 10.0, reasoning: 1.25, cached: 0.125 },
    capabilities: [
      "thinking",
      "extended-thinking",
      "vision",
      "function-calling",
    ],
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
    knowledgeCutoff: "November 2025",
  },
  "openai:gpt-5.1-instant": {
    id: "openai:gpt-5.1-instant",
    provider: "openai",
    name: "GPT-5.1 Instant",
    description:
      "Fast conversational variant with improved tone and personalization",
    contextWindow: 128000,
    pricing: { input: 0.25, output: 2.0, cached: 0.025 },
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "November 2025",
  },
  "openai:gpt-oss-20b": {
    id: "openai:gpt-oss-20b",
    provider: "openai",
    name: "GPT-OSS 20B",
    description:
      "Compact MoE optimized for low-latency and edge deployments (1000 T/sec)",
    contextWindow: 131000,
    pricing: { input: 0.1, output: 0.5 },
    capabilities: ["function-calling"],
    providerOrder: ["cerebras", "groq"],
  },
  "openai:gpt-oss-120b": {
    id: "openai:gpt-oss-120b",
    provider: "openai",
    name: "GPT-OSS 120B",
    description:
      "Extremely capable general-purpose LLM with strong, controllable reasoning",
    contextWindow: 131000,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ["function-calling", "thinking"],
    providerOrder: ["cerebras", "groq", "fireworks"],
  },

  // Anthropic
  "anthropic:claude-opus-4.5": {
    id: "anthropic:claude-opus-4.5",
    provider: "anthropic",
    name: "Claude 4.5 Opus",
    description: "Most capable Claude for complex tasks",
    contextWindow: 200000,
    pricing: { input: 5.0, output: 25.0, cached: 0.5 },
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
    knowledgeCutoff: "April 2025",
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
    knowledgeCutoff: "April 2025",
  },
  "anthropic:claude-haiku-4.5": {
    id: "anthropic:claude-haiku-4.5",
    provider: "anthropic",
    name: "Claude 4.5 Haiku",
    description: "Fast and cost-effective",
    contextWindow: 200000,
    pricing: { input: 1.0, output: 5.0, cached: 0.1 },
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "April 2025",
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
    knowledgeCutoff: "January 2025",
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
    knowledgeCutoff: "January 2025",
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
    knowledgeCutoff: "August 2024",
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
    knowledgeCutoff: "August 2024",
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
    knowledgeCutoff: "August 2024",
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
    description:
      "Third-generation flagship model with advanced reasoning (experimental)",
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
    knowledgeCutoff: "August 2025",
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
    knowledgeCutoff: "August 2025",
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
    knowledgeCutoff: "July 2025",
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
    knowledgeCutoff: "July 2025",
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
    knowledgeCutoff: "July 2025",
  },
  "xai:grok-code-fast-1": {
    id: "xai:grok-code-fast-1",
    provider: "xai",
    name: "Grok Code Fast",
    description: "Speedy reasoning for coding",
    contextWindow: 128000,
    pricing: { input: 0.5, output: 2.0 },
    capabilities: ["thinking"],
    knowledgeCutoff: "July 2025",
  },

  // Perplexity (Only 4 models available in Vercel AI Gateway)
  "perplexity:sonar-reasoning-pro": {
    id: "perplexity:sonar-reasoning-pro",
    provider: "perplexity",
    name: "Sonar Reasoning Pro",
    description: "DeepSeek R1 powered reasoning with CoT",
    contextWindow: 127000,
    pricing: { input: 2.0, output: 8.0 },
    capabilities: ["thinking"],
    knowledgeCutoff: "Real-time search",
  },
  "perplexity:sonar-pro": {
    id: "perplexity:sonar-pro",
    provider: "perplexity",
    name: "Sonar Pro",
    description: "Advanced search with grounding",
    contextWindow: 127000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: [],
    knowledgeCutoff: "Real-time search",
  },

  "perplexity:sonar-reasoning": {
    id: "perplexity:sonar-reasoning",
    provider: "perplexity",
    name: "Sonar Reasoning",
    description: "Fast real-time reasoning",
    contextWindow: 127000,
    pricing: { input: 1.0, output: 5.0 },
    capabilities: ["thinking"],
    knowledgeCutoff: "Real-time search",
  },
  "perplexity:sonar": {
    id: "perplexity:sonar",
    provider: "perplexity",
    name: "Sonar",
    description: "Lightweight, fast search",
    contextWindow: 127000,
    pricing: { input: 1.0, output: 1.0 },
    capabilities: [],
    knowledgeCutoff: "Real-time search",
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
    description:
      "Llama 4's largest MoE model with coding, reasoning, and image capabilities.",
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
  "mistral:mistral-large-3": {
    id: "mistral:mistral-large-3",
    provider: "mistral",
    name: "Mistral Large 3",
    description:
      "Most capable Mistral model. Sparse MoE with 41B active / 675B total params.",
    contextWindow: 256000,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ["function-calling", "vision"],
  },
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
  "alibaba:qwen3-max": {
    id: "alibaba:qwen3-max",
    provider: "alibaba",
    name: "Qwen 3 Max",
    description:
      "SOTA agent and tool invocation. Specialized for complex agentic scenarios.",
    contextWindow: 262000,
    pricing: { input: 1.2, output: 6.0, cached: 0.24 },
    capabilities: ["function-calling", "thinking"],
  },
  "alibaba:qwen3-coder-480b": {
    id: "alibaba:qwen3-coder-480b",
    provider: "alibaba",
    name: "Qwen 3 Coder 480B",
    description: "480B MoE coding specialist optimized for agentic tasks.",
    contextWindow: 131072,
    pricing: { input: 0.35, output: 1.4 },
    capabilities: ["function-calling"],
  },

  // Moonshot AI Kimi Models (via Vercel AI Gateway)
  "moonshotai:kimi-k2": {
    id: "moonshotai:kimi-k2",
    provider: "kimi",
    name: "Kimi K2",
    description:
      "1T MoE (32B active). Optimized for agentic tool use, reasoning, and code synthesis.",
    contextWindow: 131000,
    pricing: { input: 0.6, output: 2.5 },
    capabilities: ["function-calling"],
    providerOrder: ["deepinfra", "fireworks"],
  },
  "moonshotai:kimi-k2-thinking": {
    id: "moonshotai:kimi-k2-thinking",
    provider: "kimi",
    name: "Kimi K2 Thinking",
    description:
      "Advanced thinking agent. 200-300 sequential tool calls. SOTA on HLE, BrowseComp.",
    contextWindow: 262000,
    pricing: { input: 0.6, output: 2.5, cached: 0.15 },
    capabilities: ["function-calling", "thinking"],
    providerOrder: ["fireworks", "deepinfra"],
  },

  // MiniMax Models (via Vercel AI Gateway)
  "minimax:minimax-m2": {
    id: "minimax:minimax-m2",
    provider: "minimax",
    name: "MiniMax M2",
    description:
      "Compact MoE (230B total / 10B active). Elite coding and agentic performance.",
    contextWindow: 205000,
    pricing: { input: 0.3, output: 1.2, cached: 0.03 },
    capabilities: ["function-calling"],
    providerOrder: ["deepinfra"],
  },

  // Z.ai GLM Models (via Vercel AI Gateway)
  "zai:glm-4.6": {
    id: "zai:glm-4.6",
    provider: "zai",
    name: "GLM 4.6",
    description:
      "Latest GLM. Enhanced coding, long-context, reasoning, and agentic applications.",
    contextWindow: 200000,
    pricing: { input: 0.45, output: 1.8, cached: 0.11 },
    capabilities: ["function-calling"],
    providerOrder: ["deepinfra", "fireworks"],
  },
  "zai:glm-4.6v-flash": {
    id: "zai:glm-4.6v-flash",
    provider: "zai",
    name: "GLM 4.6V Flash",
    description:
      "Multimodal vision model. SOTA visual understanding. Low-latency.",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: ["vision", "function-calling"],
  },
  "zai:glm-4.5-air": {
    id: "zai:glm-4.5-air",
    provider: "zai",
    name: "GLM 4.5 Air",
    description:
      "Lightweight MoE (106B total / 12B active). Agent-oriented foundation model.",
    contextWindow: 128000,
    pricing: { input: 0.2, output: 1.1 },
    capabilities: ["function-calling"],
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
    knowledgeCutoff: "November 2024",
  },
  "deepseek:deepseek-v3.2": {
    id: "deepseek:deepseek-v3.2",
    provider: "deepseek",
    name: "DeepSeek V3.2",
    description:
      "Official successor to V3.2-Exp. Combined thinking + tool use.",
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
