import { computeModelMetrics } from "./benchmarks";
import type { GatewayName } from "./providers";
import type { ReasoningConfig } from "./reasoning/types";
import type { BenchmarkScores, ComputedMetrics, SpeedTier } from "./types";

/**
 * AUTO_MODEL - Special "auto" mode for intelligent model routing.
 * When selected, the system classifies the task and routes to optimal model.
 */
export const AUTO_MODEL = {
  id: "auto",
  provider: "auto" as const,
  name: "Auto",
  description: "Intelligently routes to optimal model based on your task",
  contextWindow: 0, // N/A - depends on selected model
  pricing: { input: 0, output: 0 }, // Variable - depends on selected model
  capabilities: [],
  userFriendlyDescription:
    "Let blah.chat pick the best model for each message. Analyzes your task and routes to the optimal model.",
  bestFor:
    "When you want the best model for each task without manual selection",
};

/** Check if a model ID is the auto router */
export const isAutoModel = (modelId: string): boolean => modelId === "auto";

export interface ModelConfig {
  id: string;
  /** Model creator/vendor (OpenAI, Anthropic, etc.) - used for grouping and icons */
  provider:
    | "auto"
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
    | "zhipu"
    | "nvidia";
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
  /** Fallback inference hosts within Vercel AI Gateway (e.g., ["cerebras", "groq"]) */
  hostOrder?: string[];
  /** Mark preview/beta/experimental models */
  isExperimental?: boolean;
  /** Knowledge cutoff date for the model (e.g., "November 2025", "Real-time search") */
  knowledgeCutoff?: string;
  /** Gateway/SDK for routing requests. Defaults to "vercel" (Vercel AI Gateway) */
  gateway?: GatewayName;
  /** User-friendly plain-language description for non-technical users */
  userFriendlyDescription?: string;
  /** Technical use case summary for power users */
  bestFor?: string;
  /** Benchmark scores (intelligence, coding, reasoning) - optional override */
  benchmarks?: BenchmarkScores;
  /** Speed tier - optional override (computed if not provided) */
  speedTier?: SpeedTier;
  /** Mark as pro/premium model requiring tier access */
  isPro?: boolean;
  /** Hide from model picker - for internal app ops only */
  isInternalOnly?: boolean;
  /** Superseded model - hidden from pickers but still resolvable for history/cost */
  isDeprecated?: boolean;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // Auto Router (special model that routes to optimal model)
  auto: AUTO_MODEL,

  // OpenAI

  // GPT-5 Series (current OpenAI GPT-5 family)
  "openai:gpt-5": {
    id: "openai:gpt-5",
    provider: "openai",
    name: "GPT-5",
    description:
      "Chat-optimized GPT-5.3 model used in ChatGPT for everyday conversations and general use.",
    contextWindow: 128000,
    pricing: { input: 1.75, output: 14.0, cached: 0.175 },
    capabilities: ["vision", "function-calling"],
    actualModelId: "gpt-5.3-chat-latest",
    knowledgeCutoff: "August 31, 2025",
    userFriendlyDescription:
      "Routes to GPT-5.3 Chat. Best OpenAI chat model for natural conversation, help, and general-purpose work.",
    bestFor: "General chat, conversational UX, everyday assistance",
  },
  "openai:gpt-5.4-pro": {
    id: "openai:gpt-5.4-pro",
    provider: "openai",
    name: "GPT-5.4 Pro",
    description:
      "Highest-capability GPT-5.4 variant for the hardest reasoning and professional tasks.",
    contextWindow: 1047576,
    pricing: { input: 30.0, output: 180.0 },
    capabilities: ["thinking", "vision", "function-calling"],
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "medium", medium: "high", high: "xhigh" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
    knowledgeCutoff: "August 31, 2025",
    userFriendlyDescription:
      "Most capable GPT-5.4 variant. Use when quality matters more than speed or cost.",
    bestFor: "Hardest reasoning, expert analysis, premium high-stakes work",
  },
  "openai:gpt-5-mini": {
    id: "openai:gpt-5-mini",
    isDeprecated: true,
    provider: "openai",
    name: "GPT-5 Mini",
    description:
      "Fast, efficient GPT-5 model balancing reasoning quality and cost.",
    contextWindow: 400000,
    pricing: { input: 0.25, output: 2.0, cached: 0.025 },
    capabilities: ["thinking", "vision", "function-calling"],
    knowledgeCutoff: "May 31, 2024",
    userFriendlyDescription:
      "Fast and affordable. Best GPT-5 balance for everyday chat, extraction, and tool use.",
    bestFor: "General purpose, structured output, cost-conscious high volume",
  },
  "openai:gpt-5-nano": {
    id: "openai:gpt-5-nano",
    isDeprecated: true,
    provider: "openai",
    name: "GPT-5 Nano",
    description:
      "Smallest, fastest GPT-5 variant for cheap classification and summarization.",
    contextWindow: 400000,
    pricing: { input: 0.05, output: 0.4, cached: 0.005 },
    capabilities: ["thinking", "vision", "function-calling"],
    knowledgeCutoff: "May 31, 2024",
    userFriendlyDescription:
      "Lightning-fast and ultra-cheap. Best for lightweight tool use, routing, and summarization.",
    bestFor: "Summaries, classification, routing, ultra-low-cost tasks",
  },

  // GPT-5.1 Family (November 2025)
  "openai:gpt-5.1": {
    id: "openai:gpt-5.1",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Best all-around model. Can read a novel's worth of text, analyze images, and think deeply about complex problems.",
    bestFor: "General purpose, adaptive reasoning, multimodal tasks",
  },
  "openai:gpt-5.1-codex": {
    id: "openai:gpt-5.1-codex",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Expert coding assistant. Writes code, debugs issues, and understands entire projects.",
    bestFor: "Agentic coding, software engineering, complex refactoring",
  },
  "openai:gpt-5.1-instant": {
    id: "openai:gpt-5.1-instant",
    isDeprecated: true,
    provider: "openai",
    name: "GPT-5.1 Instant",
    description:
      "Fast conversational variant with improved tone and personalization",
    contextWindow: 128000,
    pricing: { input: 0.25, output: 2.0, cached: 0.025 },
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "November 2025",
    userFriendlyDescription:
      "Fast and personable. Great for natural conversations with a friendly, adaptive tone.",
    bestFor: "Conversational tasks, quick responses, personalized interactions",
  },

  // GPT-5.2 Family (December 2025)
  "openai:gpt-5.2": {
    id: "openai:gpt-5.2",
    isDeprecated: true,
    provider: "openai",
    name: "GPT-5.2",
    description:
      "OpenAI's best general-purpose model. Most intelligent model for general and agentic tasks.",
    contextWindow: 400000,
    pricing: { input: 1.75, output: 14.0, cached: 0.17 },
    capabilities: ["thinking", "vision", "function-calling"],
    reasoning: {
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    },
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Most intelligent model yet. Advances GPT-5 with 400k context, deep reasoning, and massive knowledge.",
    bestFor: "Deep reasoning, massive context tasks, complex agentic workflows",
  },
  "openai:gpt-5.2-chat": {
    id: "openai:gpt-5.2-chat",
    isDeprecated: true,
    provider: "openai",
    name: "GPT-5.2 Chat",
    description: "The model powering ChatGPT. Best general-purpose model.",
    contextWindow: 128000,
    pricing: { input: 1.75, output: 14.0, cached: 0.17 },
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "The brain behind ChatGPT. Intelligent, versatile, and optimized for natural conversation.",
    bestFor: "General conversation, content creation, everyday intelligence",
  },
  "openai:gpt-oss-20b": {
    id: "openai:gpt-oss-20b",
    provider: "openai",
    name: "GPT-OSS 20B",
    description:
      "Compact MoE optimized for low-latency and edge deployments (1000 T/sec)",
    contextWindow: 131000,
    pricing: { input: 0.1, output: 0.5 },
    capabilities: ["function-calling", "thinking"],
    hostOrder: ["cerebras", "groq"],
    userFriendlyDescription:
      "Instant responses. Blazing-fast model for when you need answers right now.",
    bestFor: "Ultra-low latency, real-time applications, edge deployment",
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
    hostOrder: ["cerebras", "groq", "fireworks"],
    userFriendlyDescription:
      "Powerful and versatile. Handles complex tasks with strong reasoning at very fast speeds.",
    bestFor: "General purpose, fast reasoning, high-performance tasks",
  },

  // Anthropic
  "anthropic:claude-opus-4.5": {
    id: "anthropic:claude-opus-4.5",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Most capable Claude. Writes sophisticated code, handles complex analysis, and excels at nuanced tasks.",
    bestFor: "Complex coding, autonomous agents, software engineering",
  },
  "anthropic:claude-sonnet-4.5": {
    id: "anthropic:claude-sonnet-4.5",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Balanced performer. Good at coding, analysis, and can even control computers. Works for most tasks.",
    bestFor: "Coding, computer use, balanced performance",
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
    userFriendlyDescription:
      "Quick and efficient. Fast responses for high-volume work without breaking the bank.",
    bestFor:
      "Quick responses, high-volume processing, cost-sensitive applications",
  },

  // Google
  "google:gemini-2.5-flash": {
    id: "google:gemini-2.5-flash",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Speed demon. Handles massive documents (can read a thousand-page book!) and responds instantly. Great for real-time tasks.",
    bestFor:
      "Speed-critical tasks, long-context processing, real-time applications",
    knowledgeCutoff: "January 2025",
  },
  "google:gemini-2.5-pro": {
    id: "google:gemini-2.5-pro",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Deep thinker with huge memory. Can analyze entire books (2 million words!) and think through complex problems.",
    bestFor: "Deep reasoning, complex multi-step analysis, research",
  },
  "google:gemini-3-flash": {
    id: "google:gemini-3-flash",
    provider: "google",
    name: "Gemini 3 Flash",
    description:
      "Google's most intelligent model built for speed. Frontier intelligence with superior search and grounding.",
    contextWindow: 1000000,
    pricing: {
      input: 0.5,
      output: 3.0,
      cached: 0.125,
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
    knowledgeCutoff: "August 2025",
    userFriendlyDescription:
      "Fast frontier intelligence. Google's smartest model optimized for speed with 1M context and built-in search grounding.",
    bestFor:
      "Speed-critical tasks, real-time applications, search-grounded responses",
  },
  "google:gemini-2.0-flash": {
    id: "google:gemini-2.0-flash",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Fast and multimodal. Quick processing of text, images, and more at an affordable price.",
    bestFor: "Quick multimodal processing, budget-conscious, general purpose",
  },
  "google:gemini-2.0-flash-lite": {
    id: "google:gemini-2.0-flash-lite",
    isDeprecated: true,
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
    userFriendlyDescription:
      "Ultra-budget friendly. Extremely fast and cheap for high-volume simple tasks.",
    bestFor: "Maximum cost efficiency, high-volume processing, simple queries",
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
    userFriendlyDescription:
      "Next-generation preview. Google's latest and most advanced model with cutting-edge reasoning.",
    bestFor: "Advanced reasoning, research, testing future capabilities",
  },

  "google:gemini-3-pro-image-preview": {
    id: "google:gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image (Nano Banana Pro)",
    provider: "google",
    contextWindow: 65536, // 65K tokens
    pricing: {
      input: 2.0, // Same as Gemini 3 Pro (text tokens)
      output: 120.0, // Image output pricing per Vercel AI Gateway - images billed at higher $/MTok-equivalent rate than text to reflect per-image rendering costs
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
    userFriendlyDescription:
      "Creates images. Generate visuals from text descriptions with advanced understanding. Free preview.",
    bestFor: "Image generation, visual creativity, design prototyping",
  },

  "google:gemini-2.5-flash-image": {
    id: "google:gemini-2.5-flash-image",
    isDeprecated: true,
    provider: "google",
    name: "Gemini 2.5 Flash Image",
    description: "Cost-effective image generation with hybrid reasoning",
    contextWindow: 32768,
    pricing: {
      input: 0.3,
      output: 2.5,
    },
    capabilities: ["image-generation", "vision"],
    isExperimental: true,
    knowledgeCutoff: "August 2025",
    userFriendlyDescription:
      "Fast image generation. Cost-effective visual creation with locale-aware, culturally appropriate outputs.",
    bestFor: "Fast, cost-effective slide image generation",
  },

  // xAI - Note: Vercel AI Gateway uses "xai/model-name" format
  "xai:grok-4-fast": {
    id: "xai:grok-4-fast",
    isDeprecated: true,
    provider: "xai",
    name: "Grok 4 Fast",
    description: "Faster Grok 4 variant (non-reasoning)",
    contextWindow: 256000,
    pricing: { input: 2.0, output: 8.0 },
    capabilities: ["function-calling"],
    actualModelId: "grok-4-fast-non-reasoning",
    knowledgeCutoff: "July 2025",
    userFriendlyDescription:
      "Fast and conversational. Quick responses with Grok's signature personality and humor.",
    bestFor: "Conversational tasks, quick responses, general purpose",
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
    userFriendlyDescription:
      "Massive memory. Can handle 2 million words of context - perfect for huge documents and long conversations.",
    bestFor: "Long-context tasks, agentic workflows, tool use",
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
    userFriendlyDescription:
      "Fast reasoning at scale. Combines thinking capabilities with speed, affordability, and huge context.",
    bestFor:
      "Cost-efficient reasoning, high-volume thinking tasks, agentic workflows",
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
    userFriendlyDescription:
      "Fast coding assistant. Quick code generation, debugging, and problem-solving at affordable prices.",
    bestFor: "Coding, debugging, cost-efficient development",
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
    userFriendlyDescription:
      "Connected to the web with deep thinking. Searches current information and reasons about real-world facts with careful analysis.",
    bestFor:
      "Research, web-grounded reasoning, factual accuracy, real-time information",
  },
  "perplexity:sonar-pro": {
    id: "perplexity:sonar-pro",
    provider: "perplexity",
    name: "Sonar Pro",
    description: "Advanced search with grounding",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: [],
    knowledgeCutoff: "Real-time search",
    userFriendlyDescription:
      "Advanced web search. Finds and analyzes current information with citation grounding for accuracy.",
    bestFor: "Research, web search, current events, fact-checking",
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
    userFriendlyDescription:
      "Fast web-connected thinking. Quick searches combined with reasoning for up-to-date insights.",
    bestFor: "Quick research, real-time reasoning, affordable web search",
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
    userFriendlyDescription:
      "Quick web search. Lightweight and fast for when you just need current information.",
    bestFor: "Fast search, current events, budget-conscious research",
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
    hostOrder: ["cerebras", "groq"],
    userFriendlyDescription:
      "Powerful open-source model. Great for coding, speaks many languages, and you control where it runs.",
    bestFor: "Open-source, coding, multilingual tasks, local deployment",
    isInternalOnly: true,
  },
  "meta:llama-4-scout": {
    id: "meta:llama-4-scout",
    provider: "meta",
    name: "Llama 4 Scout 17B",
    description: "Smaller Llama 4 MoE. Fast and efficient for general tasks.",
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.3 },
    capabilities: ["function-calling"],
    hostOrder: ["cerebras", "groq"],
    userFriendlyDescription:
      "Fast and efficient. Compact Llama 4 model great for everyday tasks at low cost.",
    bestFor: "General purpose, cost efficiency, fast processing",
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
    userFriendlyDescription:
      "European alternative. Handles general tasks well with vision support at competitive pricing.",
    bestFor: "General purpose, cost-effective, European data residency",
  },
  "mistral:devstral-small": {
    id: "mistral:devstral-small",
    provider: "mistral",
    name: "Mistral Devstral Small",
    description: "Agentic LLM optimized for software engineering tasks.",
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.3 },
    capabilities: ["function-calling"],
    userFriendlyDescription:
      "Coding specialist. Optimized for software engineering with agentic capabilities.",
    bestFor: "Software development, agentic coding, European alternative",
  },

  // Alibaba Qwen Models (via Vercel AI Gateway)
  "alibaba:qwen3-max": {
    id: "alibaba:qwen3-max",
    isDeprecated: true,
    provider: "alibaba",
    name: "Qwen 3 Max",
    description:
      "SOTA agent and tool invocation. Specialized for complex agentic scenarios.",
    contextWindow: 262000,
    pricing: { input: 1.2, output: 6.0, cached: 0.24 },
    capabilities: ["function-calling", "thinking"],
    userFriendlyDescription:
      "Expert agent. Excels at using tools and handling complex multi-step workflows.",
    bestFor: "Agentic tasks, tool invocation, complex workflows",
  },
  "alibaba:qwen3-coder-480b": {
    id: "alibaba:qwen3-coder-480b",
    provider: "alibaba",
    name: "Qwen 3 Coder 480B",
    description: "480B MoE coding specialist optimized for agentic tasks.",
    contextWindow: 131072,
    pricing: { input: 0.35, output: 1.4 },
    capabilities: ["function-calling"],
    userFriendlyDescription:
      "Massive coding model. 480 billion parameters specialized for sophisticated code generation.",
    bestFor: "Advanced coding, large-scale projects, agentic development",
    isInternalOnly: true,
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
    hostOrder: ["deepinfra", "fireworks"],
    userFriendlyDescription:
      "Agentic powerhouse. Excels at using tools and generating code with sophisticated reasoning.",
    bestFor: "Agentic workflows, tool use, code synthesis",
    isInternalOnly: true,
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
    hostOrder: ["fireworks", "deepinfra"],
    userFriendlyDescription:
      "Advanced thinking agent. Can make hundreds of tool calls in sequence for complex multi-step tasks.",
    bestFor: "Complex agentic tasks, multi-step reasoning, advanced workflows",
    isInternalOnly: true,
  },

  // MiniMax Models (via Vercel AI Gateway)
  "minimax:minimax-m2": {
    id: "minimax:minimax-m2",
    isDeprecated: true,
    provider: "minimax",
    name: "MiniMax M2",
    description:
      "Compact MoE (230B total / 10B active). Elite coding and agentic performance.",
    contextWindow: 205000,
    pricing: { input: 0.3, output: 1.2, cached: 0.03 },
    capabilities: ["function-calling"],
    hostOrder: ["deepinfra"],
    userFriendlyDescription:
      "Efficient powerhouse. Compact model with elite coding and agentic performance.",
    bestFor: "Coding, agentic tasks, efficient performance",
  },
  "minimax:minimax-m2.1": {
    id: "minimax:minimax-m2.1",
    provider: "minimax",
    name: "MiniMax M2.1",
    description:
      "Optimized for coding, tool use, instruction following, and long-horizon planning.",
    contextWindow: 205000,
    pricing: { input: 0.3, output: 1.2, cached: 0.03 },
    capabilities: ["function-calling"],
    userFriendlyDescription:
      "Robust coding model. Excels at tool use and long-horizon planning.",
    bestFor: "Coding, tool use, instruction following, planning",
  },
  "minimax:minimax-m2.1-lightning": {
    id: "minimax:minimax-m2.1-lightning",
    provider: "minimax",
    name: "MiniMax M2.1 Lightning",
    description:
      "Faster M2.1 variant (~100 TPS). Same performance, higher throughput.",
    contextWindow: 205000,
    pricing: { input: 0.3, output: 2.4, cached: 0.03 },
    capabilities: ["function-calling"],
    userFriendlyDescription:
      "Speed-optimized M2.1. Same smarts, nearly 2x faster output.",
    bestFor: "Low-latency coding, real-time applications, fast responses",
  },

  // Z.ai GLM Models (via Vercel AI Gateway)
  "zai:glm-4.6": {
    id: "zai:glm-4.6",
    isDeprecated: true,
    provider: "zai",
    name: "GLM 4.6",
    description:
      "Latest GLM. Enhanced coding, long-context, reasoning, and agentic applications.",
    contextWindow: 200000,
    pricing: { input: 0.45, output: 1.8, cached: 0.11 },
    capabilities: ["function-calling"],
    hostOrder: ["deepinfra", "fireworks"],
    userFriendlyDescription:
      "Versatile Chinese model. Strong at coding, reasoning, and agentic tasks with large context.",
    bestFor: "Coding, agentic applications, long-context tasks",
  },
  "zai:glm-4.7": {
    id: "zai:glm-4.7",
    provider: "zai",
    name: "GLM 4.7",
    description:
      "Latest flagship with stronger coding and multi-step reasoning.",
    contextWindow: 200000,
    pricing: { input: 0.6, output: 2.2, cached: 0.11 },
    capabilities: ["function-calling", "thinking"],
    hostOrder: ["deepinfra", "fireworks"],
    userFriendlyDescription:
      "Powerful coding model. Strong at agentic tasks and multi-step reasoning.",
    bestFor: "Coding, agentic workflows, multi-step reasoning",
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
    userFriendlyDescription:
      "Fast vision model. Quick image understanding with low latency. Free preview.",
    bestFor: "Visual understanding, fast multimodal, image analysis",
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
    userFriendlyDescription:
      "Lightweight agent. Compact model optimized for agentic workflows and tool use.",
    bestFor: "Agentic tasks, cost-efficient, lightweight",
    isInternalOnly: true,
  },

  // DeepSeek Models
  "deepseek:deepseek-r1": {
    id: "deepseek:deepseek-r1",
    isDeprecated: true,
    provider: "deepseek",
    name: "DeepSeek R1",
    description: "671B MoE reasoning model. Extended thinking.",
    contextWindow: 128000,
    pricing: { input: 0.55, output: 2.19 },
    capabilities: ["thinking", "function-calling"],
    hostOrder: ["cerebras", "groq"],
    reasoning: {
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    },
    knowledgeCutoff: "November 2024",
    userFriendlyDescription:
      "Innovative reasoner. Massive model (671 billion parameters) with groundbreaking reasoning architecture.",
    bestFor:
      "Complex reasoning, innovative architecture, research applications",
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
    userFriendlyDescription:
      "Balanced thinker with tools. Combines reasoning capabilities with tool use at affordable pricing.",
    bestFor: "Reasoning with tools, cost-effective thinking, general purpose",
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
    userFriendlyDescription:
      "Pure reasoning mode. Focused on complex problem-solving without tool use distractions.",
    bestFor: "Pure reasoning, complex analysis, thought-intensive tasks",
  },

  // Free Models via OpenRouter
  "openrouter:glm-5": {
    id: "openrouter:glm-5",
    provider: "zai",
    name: "GLM 5",
    description:
      "Z.ai flagship open-source model for complex systems design and long-horizon agent workflows.",
    contextWindow: 80000,
    pricing: { input: 0.72, output: 2.3 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "z-ai/glm-5",
    gateway: "openrouter",
    userFriendlyDescription:
      "Z.ai flagship for expert agent workflows. Strong at large programming tasks and autonomous execution.",
    bestFor: "Complex coding, agentic workflows, long-horizon planning",
  },
  "openrouter:minimax-m2.7": {
    id: "openrouter:minimax-m2.7",
    provider: "minimax",
    name: "MiniMax M2.7",
    description:
      "Next-generation MiniMax model for autonomous productivity and multi-agent collaboration.",
    contextWindow: 204800,
    pricing: { input: 0.3, output: 1.2 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "minimax/minimax-m2.7",
    gateway: "openrouter",
    userFriendlyDescription:
      "Next-gen MiniMax agent. Strong at live debugging, root-cause analysis, and long workflows.",
    bestFor: "Agentic tasks, debugging, document generation, long workflows",
  },
  "openrouter:qwen3-coder": {
    id: "openrouter:qwen3-coder",
    provider: "alibaba",
    name: "Qwen3 Coder",
    description: "480B coding specialist with 35B active params.",
    contextWindow: 262000,
    pricing: { input: 0, output: 0 },
    capabilities: ["function-calling"],
    actualModelId: "qwen/qwen3-coder:free",
    gateway: "openrouter",
    userFriendlyDescription:
      "Massive coding model at zero cost. 480B total params, optimized for code tasks.",
    bestFor: "Code generation, agentic coding, long-context reasoning",
  },
  "openrouter:kimi-k2.5": {
    id: "openrouter:kimi-k2.5",
    provider: "kimi",
    name: "Kimi K2.5",
    description:
      "State-of-the-art visual coding model with self-directed agent swarm paradigm.",
    contextWindow: 262144,
    pricing: { input: 0.6, output: 3.0, cached: 0.1 },
    capabilities: ["vision", "function-calling", "thinking"],
    actualModelId: "moonshotai/kimi-k2.5",
    gateway: "openrouter",
    userFriendlyDescription:
      "Moonshot flagship visual coding model. Excels at complex coding tasks with strong reasoning and agentic tool-calling.",
    bestFor: "Visual coding, agentic workflows, complex reasoning tasks",
    knowledgeCutoff: "January 2026",
  },
  "openrouter:llama-3.3-70b": {
    id: "openrouter:llama-3.3-70b",
    provider: "meta",
    name: "Llama 3.3 70B",
    description: "Meta's multilingual dialogue model.",
    contextWindow: 131072,
    pricing: { input: 0, output: 0 },
    capabilities: ["function-calling"],
    actualModelId: "meta-llama/llama-3.3-70b-instruct:free",
    gateway: "openrouter",
    userFriendlyDescription:
      "Strong multilingual model supporting 8 languages including English, German, French.",
    bestFor: "Multilingual dialogue, general purpose, instruction following",
  },

  // ===== 2026 model refresh via OpenRouter =====

  // Anthropic
  "openrouter:claude-opus-4.7": {
    id: "openrouter:claude-opus-4.7",
    provider: "anthropic",
    name: "Claude Opus 4.7",
    description:
      "Anthropic's next-gen Opus for long-running asynchronous agents and frontier coding.",
    contextWindow: 1000000,
    pricing: { input: 5.0, output: 25.0, cached: 0.5 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "anthropic/claude-opus-4.7",
    gateway: "openrouter",
    userFriendlyDescription:
      "Anthropic's flagship reasoning model with 1M context. Built for long agents and the hardest coding work.",
    bestFor:
      "Long-horizon agents, complex coding, expert analysis, deep multimodal reasoning",
  },
  "openrouter:claude-sonnet-4.6": {
    id: "openrouter:claude-sonnet-4.6",
    provider: "anthropic",
    name: "Claude Sonnet 4.6",
    description:
      "Anthropic's most capable Sonnet-class model with frontier coding and agentic performance.",
    contextWindow: 1000000,
    pricing: { input: 3.0, output: 15.0, cached: 0.3 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "anthropic/claude-sonnet-4.6",
    gateway: "openrouter",
    userFriendlyDescription:
      "Workhorse Sonnet with 1M context. Strong reasoning at a third of Opus pricing.",
    bestFor:
      "Production agents, code review, professional writing, multimodal tasks",
  },
  "openrouter:claude-haiku-4.5": {
    id: "openrouter:claude-haiku-4.5",
    provider: "anthropic",
    name: "Claude Haiku 4.5",
    description:
      "Anthropic's fastest, cheapest tier with near-frontier intelligence.",
    contextWindow: 200000,
    pricing: { input: 1.0, output: 5.0, cached: 0.1 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "anthropic/claude-haiku-4.5",
    gateway: "openrouter",
    userFriendlyDescription:
      "Anthropic's speed tier. Reasoning + vision + tools at low cost and low latency.",
    bestFor: "High-volume chat, classification, latency-sensitive tool use",
  },

  // OpenAI
  "openrouter:gpt-5.5": {
    id: "openrouter:gpt-5.5",
    provider: "openai",
    name: "GPT-5.5",
    description:
      "OpenAI's frontier model with stronger reasoning, reliability, and 1M context.",
    contextWindow: 1050000,
    pricing: { input: 5.0, output: 30.0, cached: 0.5 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "openai/gpt-5.5",
    gateway: "openrouter",
    knowledgeCutoff: "December 2025",
    userFriendlyDescription:
      "OpenAI flagship via OpenRouter. Top-tier reasoning across very long contexts.",
    bestFor: "Complex professional workloads, deep reasoning, agentic systems",
  },
  "openrouter:gpt-5.4-mini": {
    id: "openrouter:gpt-5.4-mini",
    provider: "openai",
    name: "GPT-5.4 Mini",
    description:
      "Efficient GPT-5.4 variant tuned for high-throughput reasoning workloads.",
    contextWindow: 400000,
    pricing: { input: 0.75, output: 4.5, cached: 0.075 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "openai/gpt-5.4-mini",
    gateway: "openrouter",
    knowledgeCutoff: "August 2025",
    userFriendlyDescription:
      "Mid-tier GPT-5.4 for everyday reasoning and tool use at a fraction of flagship cost.",
    bestFor: "General assistant work, structured extraction, balanced cost",
  },
  "openrouter:gpt-5.4-nano": {
    id: "openrouter:gpt-5.4-nano",
    provider: "openai",
    name: "GPT-5.4 Nano",
    description:
      "Lightweight, low-latency GPT-5.4 for speed-critical, high-volume tasks.",
    contextWindow: 400000,
    pricing: { input: 0.2, output: 1.25, cached: 0.02 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "openai/gpt-5.4-nano",
    gateway: "openrouter",
    knowledgeCutoff: "August 2025",
    userFriendlyDescription:
      "Smallest GPT-5.4. Cheap, fast, still multimodal and reasoning-capable.",
    bestFor: "Routing, classification, summaries, ultra-cheap structured calls",
  },

  // Google
  "openrouter:gemini-3.1-flash-lite": {
    id: "openrouter:gemini-3.1-flash-lite",
    provider: "google",
    name: "Gemini 3.1 Flash Lite",
    description:
      "Google's GA high-efficiency multimodal model. Text, image, audio, video, and file.",
    contextWindow: 1048576,
    pricing: { input: 0.25, output: 1.5, cached: 0.025 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "google/gemini-3.1-flash-lite",
    gateway: "openrouter",
    userFriendlyDescription:
      "Cheap, fast Gemini 3.1 with full multimodal input and 1M context.",
    bestFor:
      "Multimodal extraction, voice/video pipelines, high-volume reasoning",
  },

  // xAI
  "openrouter:grok-4.20": {
    id: "openrouter:grok-4.20",
    provider: "xai",
    name: "Grok 4.20",
    description:
      "xAI reasoning model with industry-leading speed, low hallucinations, and 2M context.",
    contextWindow: 2000000,
    pricing: { input: 1.25, output: 2.5, cached: 0.2 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "x-ai/grok-4.20",
    gateway: "openrouter",
    knowledgeCutoff: "September 2025",
    userFriendlyDescription:
      "Grok with 2M context. Fast reasoning, agentic tool calls, low hallucination rate.",
    bestFor:
      "Massive-context agents, fact-grounded reasoning, real-time tool use",
  },

  // DeepSeek
  "openrouter:deepseek-v4-pro": {
    id: "openrouter:deepseek-v4-pro",
    provider: "deepseek",
    name: "DeepSeek V4 Pro",
    description:
      "1.6T-param MoE with 49B active, 1M context, strong reasoning and tools.",
    contextWindow: 1048576,
    pricing: { input: 0.435, output: 0.87, cached: 0.004 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "deepseek/deepseek-v4-pro",
    gateway: "openrouter",
    userFriendlyDescription:
      "DeepSeek's flagship. Frontier reasoning at a fraction of US-lab pricing.",
    bestFor: "Research-grade reasoning, long-context analysis, agentic coding",
  },
  "openrouter:deepseek-v4-flash": {
    id: "openrouter:deepseek-v4-flash",
    provider: "deepseek",
    name: "DeepSeek V4 Flash",
    description:
      "Efficiency-tier V4 MoE (284B/13B active) with 1M context, reasoning, and tools.",
    contextWindow: 1048576,
    pricing: { input: 0.112, output: 0.224, cached: 0.022 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "deepseek/deepseek-v4-flash",
    gateway: "openrouter",
    userFriendlyDescription:
      "DeepSeek's cheap, fast reasoning model. 1M context for under $0.25/M output.",
    bestFor:
      "High-volume reasoning, batch analysis, cost-sensitive agentic workflows",
  },

  // Alibaba (Qwen)
  "openrouter:qwen3.6-flash": {
    id: "openrouter:qwen3.6-flash",
    provider: "alibaba",
    name: "Qwen 3.6 Flash",
    description:
      "Fast Qwen 3.6 with 1M context, image and video input, reasoning, and tools.",
    contextWindow: 1000000,
    pricing: { input: 0.188, output: 1.125 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "qwen/qwen3.6-flash",
    gateway: "openrouter",
    userFriendlyDescription:
      "Qwen 3.6 speed tier. Multimodal with 1M context at very low cost.",
    bestFor:
      "Long multimodal extraction, video understanding, cheap reasoning at scale",
  },
  "openrouter:qwen3.6-max-preview": {
    id: "openrouter:qwen3.6-max-preview",
    provider: "alibaba",
    name: "Qwen 3.6 Max (Preview)",
    description:
      "Alibaba's frontier Qwen MoE for the hardest reasoning and coding tasks.",
    contextWindow: 262144,
    pricing: { input: 1.04, output: 6.24 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "qwen/qwen3.6-max-preview",
    gateway: "openrouter",
    isExperimental: true,
    userFriendlyDescription:
      "Qwen flagship preview. Top reasoning for complex coding and analysis.",
    bestFor: "Hardest reasoning, complex coding, expert technical work",
  },

  // Moonshot (Kimi)
  "openrouter:kimi-k2.6": {
    id: "openrouter:kimi-k2.6",
    provider: "kimi",
    name: "Kimi K2.6",
    description:
      "Moonshot's next-gen multimodal Kimi for long-horizon coding and UI generation.",
    contextWindow: 262144,
    pricing: { input: 0.73, output: 3.49, cached: 0.25 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "moonshotai/kimi-k2.6",
    gateway: "openrouter",
    userFriendlyDescription:
      "Latest Kimi. Strong visual coding, multi-agent flows, long-horizon planning.",
    bestFor: "Visual coding, agent swarms, UI/UX generation",
  },
  "openrouter:kimi-k2-thinking": {
    id: "openrouter:kimi-k2-thinking",
    provider: "kimi",
    name: "Kimi K2 Thinking",
    description:
      "Open reasoning variant of K2 tuned for agentic long-horizon planning.",
    contextWindow: 262144,
    pricing: { input: 0.6, output: 2.5 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "moonshotai/kimi-k2-thinking",
    gateway: "openrouter",
    userFriendlyDescription:
      "Reasoning-tuned Kimi K2. Visible chain-of-thought for complex problem solving.",
    bestFor: "Step-by-step reasoning, planning, agentic decomposition",
  },

  // Meta (Llama 4)
  "openrouter:llama-4-maverick": {
    id: "openrouter:llama-4-maverick",
    provider: "meta",
    name: "Llama 4 Maverick",
    description:
      "Meta's 17B-active MoE (128 experts), multimodal with 1M context.",
    contextWindow: 1048576,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ["vision"],
    actualModelId: "meta-llama/llama-4-maverick",
    gateway: "openrouter",
    knowledgeCutoff: "August 2024",
    userFriendlyDescription:
      "Meta's flagship Llama 4 with vision and 1M context at strong cost-per-quality.",
    bestFor: "Multimodal chat, open-weight production deployments",
  },
  "openrouter:llama-4-scout": {
    id: "openrouter:llama-4-scout",
    provider: "meta",
    name: "Llama 4 Scout",
    description:
      "Meta's 17B-active MoE (16 experts) with an extreme 10M-token context window.",
    contextWindow: 10000000,
    pricing: { input: 0.08, output: 0.3 },
    capabilities: ["vision", "function-calling"],
    actualModelId: "meta-llama/llama-4-scout",
    gateway: "openrouter",
    knowledgeCutoff: "August 2024",
    userFriendlyDescription:
      "Long-context champion: 10M tokens for whole-codebase or huge-document tasks.",
    bestFor:
      "Massive document analysis, full repository reasoning, archive search",
  },

  // Mistral
  "openrouter:mistral-large-2512": {
    id: "openrouter:mistral-large-2512",
    provider: "mistral",
    name: "Mistral Large 3 (2512)",
    description:
      "Mistral's most capable model with sparse MoE, vision, and tool use.",
    contextWindow: 262144,
    pricing: { input: 0.5, output: 1.5, cached: 0.05 },
    capabilities: ["vision", "function-calling"],
    actualModelId: "mistralai/mistral-large-2512",
    gateway: "openrouter",
    userFriendlyDescription:
      "Mistral flagship. Multimodal, tool-using, and very competitively priced.",
    bestFor: "General assistant work, code, structured extraction with tools",
  },
  "openrouter:ministral-8b": {
    id: "openrouter:ministral-8b",
    provider: "mistral",
    name: "Ministral 3 8B",
    description: "Tiny, efficient Mistral with vision and tools.",
    contextWindow: 262144,
    pricing: { input: 0.15, output: 0.15, cached: 0.015 },
    capabilities: ["vision", "function-calling"],
    actualModelId: "mistralai/ministral-8b-2512",
    gateway: "openrouter",
    userFriendlyDescription:
      "Cheap, fast Mistral with vision. Flat $0.15/M for input and output.",
    bestFor: "High-throughput classification, lightweight agents, edge use",
  },

  // Z.ai (GLM)
  "openrouter:glm-5.1": {
    id: "openrouter:glm-5.1",
    provider: "zai",
    name: "GLM 5.1",
    description:
      "Z.ai flagship update with major coding and long-horizon task gains.",
    contextWindow: 202752,
    pricing: { input: 0.98, output: 3.08, cached: 0.182 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "z-ai/glm-5.1",
    gateway: "openrouter",
    userFriendlyDescription:
      "Latest GLM. Notable jump in long-horizon coding and agentic execution.",
    bestFor: "Complex coding, autonomous workflows, long-horizon agents",
  },
  "openrouter:glm-4.7-flash": {
    id: "openrouter:glm-4.7-flash",
    provider: "zai",
    name: "GLM 4.7 Flash",
    description:
      "30B-class SOTA model optimized for agentic coding at very low cost.",
    contextWindow: 202752,
    pricing: { input: 0.06, output: 0.4, cached: 0.01 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "z-ai/glm-4.7-flash",
    gateway: "openrouter",
    userFriendlyDescription:
      "Bargain agentic GLM. Strong coding and tool use at $0.06/$0.4 per M.",
    bestFor: "Cheap agentic coding, high-volume tool calls, batch reasoning",
  },

  // NVIDIA Nemotron
  "openrouter:nemotron-3-super-120b": {
    id: "openrouter:nemotron-3-super-120b",
    provider: "nvidia",
    name: "Nemotron 3 Super 120B",
    description:
      "NVIDIA's 120B hybrid MoE (12B active) with reasoning, tools, and 1M context.",
    contextWindow: 1000000,
    pricing: { input: 0.1, output: 0.5 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "nvidia/nemotron-3-super-120b-a12b",
    gateway: "openrouter",
    userFriendlyDescription:
      "NVIDIA's open reasoning flagship. Cheap, capable, with 1M context.",
    bestFor: "Open-weight reasoning, agentic tool use, long-context analysis",
  },

  // ===== Latest flagships (June 2026 refresh via OpenRouter) =====

  // Anthropic
  "openrouter:claude-fable-5": {
    id: "openrouter:claude-fable-5",
    provider: "anthropic",
    name: "Claude Fable 5",
    description:
      "Anthropic's most capable model. Mythos-class reasoning for the hardest agentic and knowledge work.",
    contextWindow: 1000000,
    pricing: { input: 10.0, output: 50.0, cached: 1.0 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "anthropic/claude-fable-5",
    gateway: "openrouter",
    isPro: true,
    userFriendlyDescription:
      "Anthropic's most powerful model. Always-on reasoning with 1M context for the most demanding work.",
    bestFor:
      "Hardest reasoning, long-horizon autonomous agents, expert knowledge work",
  },
  "openrouter:claude-opus-4.8": {
    id: "openrouter:claude-opus-4.8",
    provider: "anthropic",
    name: "Claude Opus 4.8",
    description:
      "Anthropic's flagship Opus — state-of-the-art long-horizon agentic execution and coding.",
    contextWindow: 1000000,
    pricing: { input: 5.0, output: 25.0, cached: 0.5 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "anthropic/claude-opus-4.8",
    gateway: "openrouter",
    userFriendlyDescription:
      "Most capable Opus. Highly autonomous with 1M context — built for complex coding and agents.",
    bestFor:
      "Complex coding, autonomous agents, deep reasoning, knowledge work",
  },

  // OpenAI
  "openrouter:gpt-5.5-pro": {
    id: "openrouter:gpt-5.5-pro",
    provider: "openai",
    name: "GPT-5.5 Pro",
    description:
      "OpenAI's high-capability model optimized for deep reasoning on complex, high-stakes workloads.",
    contextWindow: 1050000,
    pricing: { input: 30.0, output: 180.0 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "openai/gpt-5.5-pro",
    gateway: "openrouter",
    isPro: true,
    knowledgeCutoff: "December 2025",
    userFriendlyDescription:
      "OpenAI's deepest reasoner. Best for the hardest, highest-stakes professional work.",
    bestFor: "Hardest reasoning, expert analysis, premium high-stakes work",
  },

  // Google
  "openrouter:gemini-3.5-flash": {
    id: "openrouter:gemini-3.5-flash",
    provider: "google",
    name: "Gemini 3.5 Flash",
    description:
      "Google's high-efficiency multimodal model — near-Pro coding and reasoning at Flash speed and cost.",
    contextWindow: 1048576,
    pricing: { input: 1.5, output: 9.0, cached: 0.15 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "google/gemini-3.5-flash",
    gateway: "openrouter",
    userFriendlyDescription:
      "Fast frontier multimodal. Near-Pro quality at Flash cost, with text, image, audio, and video input.",
    bestFor:
      "Speed-critical reasoning, multimodal extraction, high-volume tasks",
  },

  // xAI
  "openrouter:grok-4.3": {
    id: "openrouter:grok-4.3",
    provider: "xai",
    name: "Grok 4.3",
    description:
      "xAI's latest reasoning model — agentic workflows, instruction-following, and tool use with 1M context.",
    contextWindow: 1000000,
    pricing: { input: 1.25, output: 2.5, cached: 0.2 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "x-ai/grok-4.3",
    gateway: "openrouter",
    knowledgeCutoff: "September 2025",
    userFriendlyDescription:
      "Latest Grok reasoning. Strong agentic tool use and instruction-following with huge context.",
    bestFor: "Agentic workflows, reasoning, tool use, real-time tasks",
  },

  // Alibaba (Qwen)
  "openrouter:qwen3.7-max": {
    id: "openrouter:qwen3.7-max",
    provider: "alibaba",
    name: "Qwen 3.7 Max",
    description:
      "Flagship of Alibaba's Qwen 3.7 series — agent-centric reasoning and tool use with 1M context.",
    contextWindow: 1000000,
    pricing: { input: 1.25, output: 3.75, cached: 0.25 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "qwen/qwen3.7-max",
    gateway: "openrouter",
    userFriendlyDescription:
      "Alibaba's flagship. Excels at agentic workflows and complex reasoning at long context.",
    bestFor: "Agentic tasks, tool invocation, complex reasoning",
  },

  // MiniMax
  "openrouter:minimax-m3": {
    id: "openrouter:minimax-m3",
    provider: "minimax",
    name: "MiniMax M3",
    description:
      "MiniMax's latest multimodal foundation model — text, image, and video input with 1M context.",
    contextWindow: 1048576,
    pricing: { input: 0.3, output: 1.2, cached: 0.06 },
    capabilities: ["thinking", "vision", "function-calling"],
    actualModelId: "minimax/minimax-m3",
    gateway: "openrouter",
    userFriendlyDescription:
      "Newest MiniMax. Multimodal reasoning with text, image, and video input at low cost.",
    bestFor: "Multimodal coding, agentic tasks, cost-efficient reasoning",
  },

  // NVIDIA Nemotron
  "openrouter:nemotron-3-ultra-550b": {
    id: "openrouter:nemotron-3-ultra-550b",
    provider: "nvidia",
    name: "Nemotron 3 Ultra 550B",
    description:
      "NVIDIA's open frontier-reasoning flagship — 55B active of 550B total (MoE), 1M context.",
    contextWindow: 1000000,
    pricing: { input: 0.5, output: 2.5, cached: 0.15 },
    capabilities: ["thinking", "function-calling"],
    actualModelId: "nvidia/nemotron-3-ultra-550b-a55b",
    gateway: "openrouter",
    userFriendlyDescription:
      "NVIDIA's open frontier reasoner. Strong reasoning and orchestration with 1M context.",
    bestFor:
      "Open-weight frontier reasoning, agentic orchestration, long-context analysis",
  },
};

/**
 * Pre-computed metrics cache for performance
 * Avoids recomputing benchmarks/metrics on every render
 */
const MODEL_METRICS_CACHE = new Map<string, ComputedMetrics>();

/**
 * Get computed metrics for a model (with caching)
 * Includes benchmark scores, speed tier, cost tier, percentiles
 *
 * @param modelId - Model ID (e.g., "openai:gpt-5")
 * @returns Computed metrics or undefined if model not found
 */
export function getModelMetrics(modelId: string): ComputedMetrics | undefined {
  const model = MODEL_CONFIG[modelId];
  if (!model) return undefined;

  if (!MODEL_METRICS_CACHE.has(modelId)) {
    // Compute all models for percentile calculations
    const allModels = Object.values(MODEL_CONFIG);
    MODEL_METRICS_CACHE.set(modelId, computeModelMetrics(model, allModels));
  }

  return MODEL_METRICS_CACHE.get(modelId)!;
}

export type Provider = ModelConfig["provider"];
export type Capability = ModelConfig["capabilities"][number];
export type ModelTier = "flagship" | "reasoning" | "fast" | "free";

/**
 * Get a human-friendly display name for a provider.
 */
export function getProviderDisplayName(provider: Provider): string {
  const displayNames: Record<Provider, string> = {
    auto: "Auto",
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    xai: "xAI",
    perplexity: "Perplexity",
    groq: "Groq",
    cerebras: "Cerebras",
    minimax: "MiniMax",
    deepseek: "DeepSeek",
    kimi: "Kimi",
    zai: "Z.ai",
    meta: "Meta",
    mistral: "Mistral",
    alibaba: "Alibaba",
    zhipu: "Zhipu",
    nvidia: "NVIDIA",
  };

  return displayNames[provider] ?? provider;
}

/**
 * Coarse product tier for model picker grouping.
 */
export function getModelTier(model: ModelConfig): ModelTier {
  if (model.pricing.input === 0 && model.pricing.output === 0) {
    return "free";
  }
  if (
    model.capabilities.includes("thinking") ||
    model.capabilities.includes("extended-thinking")
  ) {
    return "reasoning";
  }
  if (model.pricing.input < 0.5) {
    return "fast";
  }
  return "flagship";
}

/**
 * Models suitable for mobile picker.
 */
export function getMobileModels(): ModelConfig[] {
  return Object.values(MODEL_CONFIG).filter(
    (model) =>
      model.id !== "auto" &&
      !model.isInternalOnly &&
      !model.isExperimental &&
      !model.isDeprecated,
  );
}
