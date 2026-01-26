/**
 * Model Seeding Script
 *
 * Seeds the models table from static MODEL_CONFIG.
 * Run this once during initial setup or when resetting the database.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// Import types from schema
type Capability =
  | "vision"
  | "function-calling"
  | "thinking"
  | "extended-thinking"
  | "image-generation";

type Provider =
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

interface ModelSeedData {
  modelId: string;
  provider: Provider;
  name: string;
  description?: string;
  contextWindow: number;
  inputCost: number;
  outputCost: number;
  cachedInputCost?: number;
  reasoningCost?: number;
  capabilities: Capability[];
  reasoningConfig?: string;
  gateway?: "vercel" | "openrouter";
  hostOrder?: string[];
  actualModelId?: string;
  isLocal?: boolean;
  knowledgeCutoff?: string;
  userFriendlyDescription?: string;
  bestFor?: string;
  benchmarks?: string;
  speedTier?: "ultra-fast" | "fast" | "medium" | "slow";
  isPro?: boolean;
  isInternalOnly?: boolean;
  isExperimental?: boolean;
  status: "active" | "deprecated" | "beta";
}

/**
 * Static model configuration to seed
 * This is a subset of the full MODEL_CONFIG from apps/web/src/lib/ai/models.ts
 */
const SEED_MODELS: ModelSeedData[] = [
  // OpenAI GPT-5 Series
  {
    modelId: "openai:gpt-5",
    provider: "openai",
    name: "GPT-5",
    description:
      "Flagship GPT-5 with advanced reasoning and multimodal capabilities",
    contextWindow: 200000,
    inputCost: 2.5,
    outputCost: 10.0,
    cachedInputCost: 0.25,
    capabilities: ["thinking", "vision", "function-calling"],
    reasoningConfig: JSON.stringify({
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    }),
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Most powerful GPT-5. Handles the most complex tasks with advanced reasoning, vision, and deep thinking.",
    bestFor: "Complex reasoning, research, advanced multimodal tasks",
    status: "active",
  },
  {
    modelId: "openai:gpt-5-mini",
    provider: "openai",
    name: "GPT-5 Mini",
    description: "Compact GPT-5 variant balancing cost and performance",
    contextWindow: 200000,
    inputCost: 0.15,
    outputCost: 0.6,
    cachedInputCost: 0.015,
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Fast and affordable. Great balance of performance and cost for everyday tasks.",
    bestFor: "General purpose, high-volume applications, cost-conscious use",
    status: "active",
  },
  {
    modelId: "openai:gpt-5-nano",
    provider: "openai",
    name: "GPT-5 Nano",
    description: "Smallest, fastest GPT-5 variant for simple queries",
    contextWindow: 200000,
    inputCost: 0.04,
    outputCost: 0.16,
    cachedInputCost: 0.004,
    capabilities: ["function-calling"],
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Lightning-fast and ultra-cheap. Perfect for simple questions and high-volume applications.",
    bestFor: "Simple queries, maximum speed, ultra-low cost",
    status: "active",
  },
  // GPT-5.1 Series
  {
    modelId: "openai:gpt-5.1",
    provider: "openai",
    name: "GPT-5.1",
    description:
      "Latest flagship with adaptive reasoning and 24h prompt caching",
    contextWindow: 256000,
    inputCost: 1.25,
    outputCost: 10.0,
    cachedInputCost: 0.125,
    capabilities: ["thinking", "vision", "function-calling"],
    reasoningConfig: JSON.stringify({
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    }),
    knowledgeCutoff: "November 2025",
    userFriendlyDescription:
      "Best all-around model. Can read a novel's worth of text, analyze images, and think deeply about complex problems.",
    bestFor: "General purpose, adaptive reasoning, multimodal tasks",
    status: "active",
  },
  {
    modelId: "openai:gpt-5.1-codex",
    provider: "openai",
    name: "GPT-5.1 Codex",
    description: "GPT-5.1 optimized for agentic coding tasks",
    contextWindow: 256000,
    inputCost: 1.25,
    outputCost: 10.0,
    cachedInputCost: 0.125,
    capabilities: ["thinking", "function-calling"],
    reasoningConfig: JSON.stringify({
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    }),
    knowledgeCutoff: "November 2025",
    userFriendlyDescription:
      "Expert coding assistant. Writes code, debugs issues, and understands entire projects.",
    bestFor: "Agentic coding, software engineering, complex refactoring",
    status: "active",
  },
  {
    modelId: "openai:gpt-5.1-instant",
    provider: "openai",
    name: "GPT-5.1 Instant",
    description:
      "Fast conversational variant with improved tone and personalization",
    contextWindow: 128000,
    inputCost: 0.25,
    outputCost: 2.0,
    cachedInputCost: 0.025,
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "November 2025",
    userFriendlyDescription:
      "Fast and personable. Great for natural conversations with a friendly, adaptive tone.",
    bestFor: "Conversational tasks, quick responses, personalized interactions",
    status: "active",
  },
  // GPT-5.2 Series
  {
    modelId: "openai:gpt-5.2",
    provider: "openai",
    name: "GPT-5.2",
    description:
      "OpenAI's best general-purpose model. Most intelligent model for general and agentic tasks.",
    contextWindow: 400000,
    inputCost: 1.75,
    outputCost: 14.0,
    cachedInputCost: 0.17,
    capabilities: ["thinking", "vision", "function-calling"],
    reasoningConfig: JSON.stringify({
      type: "openai-reasoning-effort",
      effortMapping: { low: "low", medium: "medium", high: "high" },
      summaryLevel: "detailed",
      useResponsesAPI: true,
    }),
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Most intelligent model yet. Advances GPT-5 with 400k context, deep reasoning, and massive knowledge.",
    bestFor: "Deep reasoning, massive context tasks, complex agentic workflows",
    status: "active",
  },
  {
    modelId: "openai:gpt-5.2-chat",
    provider: "openai",
    name: "GPT-5.2 Chat",
    description: "The model powering ChatGPT. Best general-purpose model.",
    contextWindow: 128000,
    inputCost: 1.75,
    outputCost: 14.0,
    cachedInputCost: 0.17,
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "The brain behind ChatGPT. Intelligent, versatile, and optimized for natural conversation.",
    bestFor: "General conversation, content creation, everyday intelligence",
    status: "active",
  },
  // GPT-OSS Series (fast inference)
  {
    modelId: "openai:gpt-oss-20b",
    provider: "openai",
    name: "GPT-OSS 20B",
    description:
      "Compact MoE optimized for low-latency and edge deployments (1000 T/sec)",
    contextWindow: 131000,
    inputCost: 0.1,
    outputCost: 0.5,
    capabilities: ["function-calling", "thinking"],
    hostOrder: ["cerebras", "groq"],
    speedTier: "ultra-fast",
    userFriendlyDescription:
      "Instant responses. Blazing-fast model for when you need answers right now.",
    bestFor: "Ultra-low latency, real-time applications, edge deployment",
    status: "active",
  },
  {
    modelId: "openai:gpt-oss-120b",
    provider: "openai",
    name: "GPT-OSS 120B",
    description:
      "Extremely capable general-purpose LLM with strong, controllable reasoning",
    contextWindow: 131000,
    inputCost: 0.15,
    outputCost: 0.6,
    capabilities: ["function-calling", "thinking"],
    hostOrder: ["cerebras", "groq", "fireworks"],
    speedTier: "ultra-fast",
    userFriendlyDescription:
      "Powerful and versatile. Handles complex tasks with strong reasoning at very fast speeds.",
    bestFor: "General purpose, fast reasoning, high-performance tasks",
    status: "active",
  },

  // Anthropic Claude
  {
    modelId: "anthropic:claude-opus-4.5",
    provider: "anthropic",
    name: "Claude 4.5 Opus",
    description: "Most capable Claude for complex tasks",
    contextWindow: 200000,
    inputCost: 5.0,
    outputCost: 25.0,
    cachedInputCost: 0.5,
    capabilities: [
      "vision",
      "function-calling",
      "thinking",
      "extended-thinking",
    ],
    reasoningConfig: JSON.stringify({
      type: "anthropic-extended-thinking",
      budgetMapping: { low: 5000, medium: 15000, high: 30000 },
      betaHeader: "interleaved-thinking-2025-05-14",
    }),
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Most capable Claude. Writes sophisticated code, handles complex analysis, and excels at nuanced tasks.",
    bestFor: "Complex coding, autonomous agents, software engineering",
    status: "active",
  },
  {
    modelId: "anthropic:claude-sonnet-4.5",
    provider: "anthropic",
    name: "Claude 4.5 Sonnet",
    description: "Balanced performance and speed",
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    cachedInputCost: 0.3,
    capabilities: [
      "vision",
      "function-calling",
      "thinking",
      "extended-thinking",
    ],
    reasoningConfig: JSON.stringify({
      type: "anthropic-extended-thinking",
      budgetMapping: { low: 5000, medium: 15000, high: 30000 },
      betaHeader: "interleaved-thinking-2025-05-14",
    }),
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Balanced performer. Good at coding, analysis, and can even control computers. Works for most tasks.",
    bestFor: "Coding, computer use, balanced performance",
    status: "active",
  },
  {
    modelId: "anthropic:claude-haiku-4.5",
    provider: "anthropic",
    name: "Claude 4.5 Haiku",
    description: "Fast and cost-effective",
    contextWindow: 200000,
    inputCost: 1.0,
    outputCost: 5.0,
    cachedInputCost: 0.1,
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "April 2025",
    userFriendlyDescription:
      "Quick and efficient. Fast responses for high-volume work without breaking the bank.",
    bestFor:
      "Quick responses, high-volume processing, cost-sensitive applications",
    status: "active",
  },

  // Google Gemini
  {
    modelId: "google:gemini-2.5-flash",
    provider: "google",
    name: "Gemini 2.5 Flash",
    description:
      "Production model with thinking - fast, multimodal, 1M context",
    contextWindow: 1048576,
    inputCost: 0.15,
    outputCost: 0.6,
    cachedInputCost: 0.019,
    reasoningCost: 3.5,
    capabilities: ["vision", "function-calling", "thinking"],
    reasoningConfig: JSON.stringify({
      type: "google-thinking-budget",
      budgetMapping: { low: 4096, medium: 12288, high: 24576 },
    }),
    knowledgeCutoff: "January 2025",
    userFriendlyDescription:
      "Speed demon. Handles massive documents (can read a thousand-page book!) and responds instantly.",
    bestFor:
      "Speed-critical tasks, long-context processing, real-time applications",
    status: "active",
  },
  {
    modelId: "google:gemini-2.5-pro",
    provider: "google",
    name: "Gemini 2.5 Pro",
    description:
      "Most capable with extended thinking - 2M context, best quality",
    contextWindow: 2097152,
    inputCost: 1.25,
    outputCost: 5.0,
    cachedInputCost: 0.31,
    capabilities: ["vision", "function-calling", "thinking"],
    reasoningConfig: JSON.stringify({
      type: "google-thinking-budget",
      budgetMapping: { low: 8192, medium: 16384, high: 24576 },
    }),
    knowledgeCutoff: "January 2025",
    userFriendlyDescription:
      "Deep thinker with huge memory. Can analyze entire books (2 million words!) and think through complex problems.",
    bestFor: "Deep reasoning, complex multi-step analysis, research",
    status: "active",
  },
  {
    modelId: "google:gemini-3-flash",
    provider: "google",
    name: "Gemini 3 Flash",
    description:
      "Google's most intelligent model built for speed. Frontier intelligence with superior search and grounding.",
    contextWindow: 1000000,
    inputCost: 0.5,
    outputCost: 3.0,
    cachedInputCost: 0.125,
    capabilities: ["vision", "function-calling", "thinking"],
    reasoningConfig: JSON.stringify({
      type: "google-thinking-budget",
      budgetMapping: { low: 4096, medium: 12288, high: 24576 },
    }),
    knowledgeCutoff: "August 2025",
    userFriendlyDescription:
      "Fast frontier intelligence. Google's smartest model optimized for speed with 1M context and built-in search grounding.",
    bestFor:
      "Speed-critical tasks, real-time applications, search-grounded responses",
    status: "active",
  },
  {
    modelId: "google:gemini-2.0-flash",
    provider: "google",
    name: "Gemini 2.0 Flash",
    description: "Stable multimodal - fast, cost-effective, no thinking",
    contextWindow: 1048576,
    inputCost: 0.075,
    outputCost: 0.3,
    cachedInputCost: 0.019,
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "August 2024",
    userFriendlyDescription:
      "Fast and multimodal. Quick processing of text, images, and more at an affordable price.",
    bestFor: "Quick multimodal processing, budget-conscious, general purpose",
    status: "active",
  },
  {
    modelId: "google:gemini-2.0-flash-lite",
    provider: "google",
    name: "Gemini 2.0 Flash Lite",
    description: "Ultra-cost-optimized - fastest, cheapest, no thinking",
    contextWindow: 1048576,
    inputCost: 0.0375,
    outputCost: 0.15,
    cachedInputCost: 0.0095,
    capabilities: ["vision", "function-calling"],
    knowledgeCutoff: "August 2024",
    userFriendlyDescription:
      "Ultra-budget friendly. Extremely fast and cheap for high-volume simple tasks.",
    bestFor: "Maximum cost efficiency, high-volume processing, simple queries",
    status: "active",
  },

  // xAI Grok
  {
    modelId: "xai:grok-4-fast",
    provider: "xai",
    name: "Grok 4 Fast",
    description: "Faster Grok 4 variant (non-reasoning)",
    contextWindow: 256000,
    inputCost: 2.0,
    outputCost: 8.0,
    capabilities: ["function-calling"],
    actualModelId: "grok-4-fast-non-reasoning",
    knowledgeCutoff: "July 2025",
    userFriendlyDescription:
      "Fast and conversational. Quick responses with Grok's signature personality and humor.",
    bestFor: "Conversational tasks, quick responses, general purpose",
    status: "active",
  },
  {
    modelId: "xai:grok-4.1-fast",
    provider: "xai",
    name: "Grok 4.1 Fast",
    description: "Best agentic tool-calling model (non-reasoning)",
    contextWindow: 2000000,
    inputCost: 1.0,
    outputCost: 4.0,
    capabilities: ["function-calling"],
    actualModelId: "grok-4.1-fast-non-reasoning",
    knowledgeCutoff: "July 2025",
    userFriendlyDescription:
      "Massive memory. Can handle 2 million words of context - perfect for huge documents and long conversations.",
    bestFor: "Long-context tasks, agentic workflows, tool use",
    status: "active",
  },
  {
    modelId: "xai:grok-4.1-fast-reasoning",
    provider: "xai",
    name: "Grok 4.1 Fast (Reasoning)",
    description: "Best agentic tool-calling model with reasoning",
    contextWindow: 2000000,
    inputCost: 1.0,
    outputCost: 4.0,
    capabilities: ["thinking", "function-calling"],
    actualModelId: "grok-4.1-fast-reasoning",
    knowledgeCutoff: "July 2025",
    userFriendlyDescription:
      "Fast reasoning at scale. Combines thinking capabilities with speed, affordability, and huge context.",
    bestFor:
      "Cost-efficient reasoning, high-volume thinking tasks, agentic workflows",
    status: "active",
  },
  {
    modelId: "xai:grok-code-fast-1",
    provider: "xai",
    name: "Grok Code Fast",
    description: "Speedy reasoning for coding",
    contextWindow: 128000,
    inputCost: 0.5,
    outputCost: 2.0,
    capabilities: ["thinking"],
    knowledgeCutoff: "July 2025",
    userFriendlyDescription:
      "Fast coding assistant. Quick code generation, debugging, and problem-solving at affordable prices.",
    bestFor: "Coding, debugging, cost-efficient development",
    status: "active",
  },

  // Perplexity
  {
    modelId: "perplexity:sonar-reasoning-pro",
    provider: "perplexity",
    name: "Sonar Reasoning Pro",
    description: "DeepSeek R1 powered reasoning with CoT",
    contextWindow: 127000,
    inputCost: 2.0,
    outputCost: 8.0,
    capabilities: ["thinking"],
    knowledgeCutoff: "Real-time search",
    userFriendlyDescription:
      "Connected to the web with deep thinking. Searches current information and reasons about real-world facts.",
    bestFor:
      "Research, web-grounded reasoning, factual accuracy, real-time information",
    status: "active",
  },
  {
    modelId: "perplexity:sonar-pro",
    provider: "perplexity",
    name: "Sonar Pro",
    description: "Advanced search with grounding",
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    capabilities: [],
    knowledgeCutoff: "Real-time search",
    userFriendlyDescription:
      "Advanced web search. Finds and analyzes current information with citation grounding for accuracy.",
    bestFor: "Research, web search, current events, fact-checking",
    status: "active",
  },
  {
    modelId: "perplexity:sonar-reasoning",
    provider: "perplexity",
    name: "Sonar Reasoning",
    description: "Fast real-time reasoning",
    contextWindow: 127000,
    inputCost: 1.0,
    outputCost: 5.0,
    capabilities: ["thinking"],
    knowledgeCutoff: "Real-time search",
    userFriendlyDescription:
      "Fast web-connected thinking. Quick searches combined with reasoning for up-to-date insights.",
    bestFor: "Quick research, real-time reasoning, affordable web search",
    status: "active",
  },
  {
    modelId: "perplexity:sonar",
    provider: "perplexity",
    name: "Sonar",
    description: "Lightweight, fast search",
    contextWindow: 127000,
    inputCost: 1.0,
    outputCost: 1.0,
    capabilities: [],
    knowledgeCutoff: "Real-time search",
    userFriendlyDescription:
      "Quick web search. Lightweight and fast for when you just need current information.",
    bestFor: "Fast search, current events, budget-conscious research",
    status: "active",
  },

  // DeepSeek
  {
    modelId: "deepseek:deepseek-r1",
    provider: "deepseek",
    name: "DeepSeek R1",
    description: "671B MoE reasoning model. Extended thinking.",
    contextWindow: 128000,
    inputCost: 0.55,
    outputCost: 2.19,
    capabilities: ["thinking", "function-calling"],
    hostOrder: ["cerebras", "groq"],
    reasoningConfig: JSON.stringify({
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    }),
    knowledgeCutoff: "November 2024",
    userFriendlyDescription:
      "Innovative reasoner. Massive model (671 billion parameters) with groundbreaking reasoning architecture.",
    bestFor:
      "Complex reasoning, innovative architecture, research applications",
    status: "active",
  },
  {
    modelId: "deepseek:deepseek-v3.2",
    provider: "deepseek",
    name: "DeepSeek V3.2",
    description:
      "Official successor to V3.2-Exp. Combined thinking + tool use.",
    contextWindow: 128000,
    inputCost: 0.27,
    outputCost: 1.1,
    capabilities: ["thinking", "function-calling"],
    reasoningConfig: JSON.stringify({
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    }),
    userFriendlyDescription:
      "Balanced thinker with tools. Combines reasoning capabilities with tool use at affordable pricing.",
    bestFor: "Reasoning with tools, cost-effective thinking, general purpose",
    status: "active",
  },

  // Meta Llama
  {
    modelId: "meta:llama-4-scout",
    provider: "meta",
    name: "Llama 4 Scout 17B",
    description: "Smaller Llama 4 MoE. Fast and efficient for general tasks.",
    contextWindow: 128000,
    inputCost: 0.1,
    outputCost: 0.3,
    capabilities: ["function-calling"],
    hostOrder: ["cerebras", "groq"],
    userFriendlyDescription:
      "Fast and efficient. Compact Llama 4 model great for everyday tasks at low cost.",
    bestFor: "General purpose, cost efficiency, fast processing",
    status: "active",
  },

  // Mistral
  {
    modelId: "mistral:mistral-large-3",
    provider: "mistral",
    name: "Mistral Large 3",
    description:
      "Most capable Mistral model. Sparse MoE with 41B active / 675B total params.",
    contextWindow: 256000,
    inputCost: 0.5,
    outputCost: 1.5,
    capabilities: ["function-calling", "vision"],
    userFriendlyDescription:
      "European alternative. Handles general tasks well with vision support at competitive pricing.",
    bestFor: "General purpose, cost-effective, European data residency",
    status: "active",
  },
  {
    modelId: "mistral:devstral-small",
    provider: "mistral",
    name: "Mistral Devstral Small",
    description: "Agentic LLM optimized for software engineering tasks.",
    contextWindow: 128000,
    inputCost: 0.1,
    outputCost: 0.3,
    capabilities: ["function-calling"],
    userFriendlyDescription:
      "Coding specialist. Optimized for software engineering with agentic capabilities.",
    bestFor: "Software development, agentic coding, European alternative",
    status: "active",
  },

  // Alibaba Qwen
  {
    modelId: "alibaba:qwen3-max",
    provider: "alibaba",
    name: "Qwen 3 Max",
    description:
      "SOTA agent and tool invocation. Specialized for complex agentic scenarios.",
    contextWindow: 262000,
    inputCost: 1.2,
    outputCost: 6.0,
    cachedInputCost: 0.24,
    capabilities: ["function-calling", "thinking"],
    userFriendlyDescription:
      "Expert agent. Excels at using tools and handling complex multi-step workflows.",
    bestFor: "Agentic tasks, tool invocation, complex workflows",
    status: "active",
  },

  // MiniMax
  {
    modelId: "minimax:minimax-m2",
    provider: "minimax",
    name: "MiniMax M2",
    description:
      "Compact MoE (230B total / 10B active). Elite coding and agentic performance.",
    contextWindow: 205000,
    inputCost: 0.3,
    outputCost: 1.2,
    cachedInputCost: 0.03,
    capabilities: ["function-calling"],
    hostOrder: ["deepinfra"],
    userFriendlyDescription:
      "Efficient powerhouse. Compact model with elite coding and agentic performance.",
    bestFor: "Coding, agentic tasks, efficient performance",
    status: "active",
  },
  {
    modelId: "minimax:minimax-m2.1",
    provider: "minimax",
    name: "MiniMax M2.1",
    description:
      "Optimized for coding, tool use, instruction following, and long-horizon planning.",
    contextWindow: 205000,
    inputCost: 0.3,
    outputCost: 1.2,
    cachedInputCost: 0.03,
    capabilities: ["function-calling"],
    userFriendlyDescription:
      "Robust coding model. Excels at tool use and long-horizon planning.",
    bestFor: "Coding, tool use, instruction following, planning",
    status: "active",
  },

  // Free models via OpenRouter
  {
    modelId: "openrouter:deepseek-r1-0528",
    provider: "deepseek",
    name: "DeepSeek R1 0528",
    description: "671B MoE reasoning model via OpenRouter (May 2025 release).",
    contextWindow: 163840,
    inputCost: 0,
    outputCost: 0,
    capabilities: ["thinking"],
    actualModelId: "deepseek/deepseek-r1-0528:free",
    gateway: "openrouter",
    reasoningConfig: JSON.stringify({
      type: "deepseek-tag-extraction",
      tagName: "think",
      applyMiddleware: true,
    }),
    knowledgeCutoff: "May 2025",
    userFriendlyDescription:
      "Powerful reasoning at zero cost. 671B parameters with visible chain-of-thought.",
    bestFor: "Complex reasoning, experimentation, cost-conscious users",
    status: "active",
  },
  {
    modelId: "openrouter:devstral-2512",
    provider: "mistral",
    name: "Devstral 2512",
    description: "123B agentic coding model by Mistral AI.",
    contextWindow: 262144,
    inputCost: 0,
    outputCost: 0,
    capabilities: ["function-calling"],
    actualModelId: "mistralai/devstral-2512:free",
    gateway: "openrouter",
    userFriendlyDescription:
      "State-of-the-art agentic coding. Explores codebases and orchestrates multi-file changes.",
    bestFor: "Code generation, agentic coding tasks, large codebases",
    status: "active",
  },
  {
    modelId: "openrouter:gemini-2.0-flash-exp",
    provider: "google",
    name: "Gemini 2.0 Flash Exp",
    description: "Experimental Gemini with 1M context and fast TTFT.",
    contextWindow: 1048576,
    inputCost: 0,
    outputCost: 0,
    capabilities: ["vision", "function-calling"],
    actualModelId: "google/gemini-2.0-flash-exp:free",
    gateway: "openrouter",
    userFriendlyDescription:
      "Experimental Gemini with massive 1M context window and fast time-to-first-token.",
    bestFor: "Long documents, multimodal tasks, fast responses",
    status: "active",
  },
];

/**
 * Model profiles for auto-router scoring
 */
const SEED_PROFILES: Array<{
  modelId: string;
  qualityScore: number;
  categoryScores: Record<string, number>;
}> = [
  {
    modelId: "openai:gpt-5",
    qualityScore: 95,
    categoryScores: {
      coding: 92,
      reasoning: 95,
      creative: 90,
      factual: 88,
      analysis: 94,
      conversation: 85,
      multimodal: 90,
      research: 80,
    },
  },
  {
    modelId: "openai:gpt-5-mini",
    qualityScore: 82,
    categoryScores: {
      coding: 80,
      reasoning: 75,
      creative: 82,
      factual: 85,
      analysis: 78,
      conversation: 88,
      multimodal: 80,
      research: 70,
    },
  },
  {
    modelId: "openai:gpt-5-nano",
    qualityScore: 70,
    categoryScores: {
      coding: 65,
      reasoning: 55,
      creative: 70,
      factual: 80,
      analysis: 60,
      conversation: 85,
      multimodal: 50,
      research: 55,
    },
  },
  {
    modelId: "openai:gpt-5.1",
    qualityScore: 96,
    categoryScores: {
      coding: 94,
      reasoning: 96,
      creative: 92,
      factual: 90,
      analysis: 95,
      conversation: 88,
      multimodal: 92,
      research: 82,
    },
  },
  {
    modelId: "openai:gpt-5.1-codex",
    qualityScore: 95,
    categoryScores: {
      coding: 98,
      reasoning: 90,
      creative: 70,
      factual: 75,
      analysis: 85,
      conversation: 65,
      multimodal: 60,
      research: 70,
    },
  },
  {
    modelId: "openai:gpt-5.1-instant",
    qualityScore: 85,
    categoryScores: {
      coding: 78,
      reasoning: 72,
      creative: 85,
      factual: 88,
      analysis: 75,
      conversation: 95,
      multimodal: 82,
      research: 70,
    },
  },
  {
    modelId: "openai:gpt-5.2",
    qualityScore: 97,
    categoryScores: {
      coding: 95,
      reasoning: 97,
      creative: 93,
      factual: 92,
      analysis: 96,
      conversation: 90,
      multimodal: 94,
      research: 85,
    },
  },
  {
    modelId: "anthropic:claude-opus-4.5",
    qualityScore: 98,
    categoryScores: {
      coding: 98,
      reasoning: 98,
      creative: 97,
      factual: 92,
      analysis: 97,
      conversation: 92,
      multimodal: 90,
      research: 82,
    },
  },
  {
    modelId: "anthropic:claude-sonnet-4.5",
    qualityScore: 94,
    categoryScores: {
      coding: 96,
      reasoning: 93,
      creative: 95,
      factual: 88,
      analysis: 92,
      conversation: 90,
      multimodal: 88,
      research: 78,
    },
  },
  {
    modelId: "anthropic:claude-haiku-4.5",
    qualityScore: 80,
    categoryScores: {
      coding: 82,
      reasoning: 75,
      creative: 85,
      factual: 85,
      analysis: 78,
      conversation: 90,
      multimodal: 78,
      research: 68,
    },
  },
  {
    modelId: "google:gemini-2.5-pro",
    qualityScore: 95,
    categoryScores: {
      coding: 93,
      reasoning: 94,
      creative: 88,
      factual: 92,
      analysis: 95,
      conversation: 85,
      multimodal: 96,
      research: 80,
    },
  },
  {
    modelId: "google:gemini-2.5-flash",
    qualityScore: 88,
    categoryScores: {
      coding: 85,
      reasoning: 85,
      creative: 82,
      factual: 90,
      analysis: 88,
      conversation: 88,
      multimodal: 90,
      research: 75,
    },
  },
  {
    modelId: "google:gemini-2.0-flash",
    qualityScore: 82,
    categoryScores: {
      coding: 78,
      reasoning: 75,
      creative: 80,
      factual: 88,
      analysis: 80,
      conversation: 90,
      multimodal: 85,
      research: 72,
    },
  },
  {
    modelId: "perplexity:sonar-pro",
    qualityScore: 85,
    categoryScores: {
      coding: 65,
      reasoning: 70,
      creative: 60,
      factual: 95,
      analysis: 80,
      conversation: 70,
      multimodal: 50,
      research: 98,
    },
  },
  {
    modelId: "perplexity:sonar",
    qualityScore: 78,
    categoryScores: {
      coding: 55,
      reasoning: 60,
      creative: 55,
      factual: 90,
      analysis: 72,
      conversation: 65,
      multimodal: 45,
      research: 92,
    },
  },
  {
    modelId: "deepseek:deepseek-r1",
    qualityScore: 90,
    categoryScores: {
      coding: 92,
      reasoning: 94,
      creative: 75,
      factual: 82,
      analysis: 88,
      conversation: 72,
      multimodal: 55,
      research: 70,
    },
  },
  {
    modelId: "meta:llama-4-scout",
    qualityScore: 82,
    categoryScores: {
      coding: 78,
      reasoning: 75,
      creative: 80,
      factual: 85,
      analysis: 78,
      conversation: 88,
      multimodal: 80,
      research: 68,
    },
  },
];

/**
 * Default auto-router configuration
 */
const DEFAULT_ROUTER_CONFIG = {
  stickinessBonus: 25,
  reasoningBonus: 15,
  researchBonus: 25,
  simplePenalty: 0.7,
  complexBoostThreshold: 85,
  complexBoostMultiplier: 1.2,
  cheapThreshold: 1.0,
  midThreshold: 5.0,
  tierWeights: JSON.stringify({
    simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
    moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
    complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
  }),
  speedBonuses: JSON.stringify({
    cerebras: 12,
    groq: 10,
    flash: 8,
    fast: 8,
    nano: 10,
    lite: 10,
    lightning: 12,
    thinking: -5,
    "extended-thinking": -8,
  }),
  routerModelId: "openai:gpt-oss-120b",
  maxRetries: 3,
  contextBuffer: 1.2,
  longContextThreshold: 128000,
};

/**
 * Seed all models into the database
 */
export const seedModels = internalMutation({
  args: {
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Optionally clear existing models
    if (args.clearExisting) {
      const existingModels = await ctx.db.query("models").collect();
      for (const model of existingModels) {
        await ctx.db.delete(model._id);
      }

      const existingProfiles = await ctx.db.query("modelProfiles").collect();
      for (const profile of existingProfiles) {
        await ctx.db.delete(profile._id);
      }

      const existingConfig = await ctx.db.query("autoRouterConfig").collect();
      for (const config of existingConfig) {
        await ctx.db.delete(config._id);
      }
    }

    // Insert models
    let insertedModels = 0;
    for (const model of SEED_MODELS) {
      // Check if model already exists
      const existing = await ctx.db
        .query("models")
        .withIndex("by_modelId", (q) => q.eq("modelId", model.modelId))
        .first();

      if (!existing) {
        await ctx.db.insert("models", {
          ...model,
          createdAt: now,
          updatedAt: now,
        });
        insertedModels++;
      }
    }

    // Insert model profiles
    let insertedProfiles = 0;
    for (const profile of SEED_PROFILES) {
      const existing = await ctx.db
        .query("modelProfiles")
        .withIndex("by_modelId", (q) => q.eq("modelId", profile.modelId))
        .first();

      if (!existing) {
        await ctx.db.insert("modelProfiles", {
          modelId: profile.modelId,
          qualityScore: profile.qualityScore,
          categoryScores: JSON.stringify(profile.categoryScores),
          updatedAt: now,
        });
        insertedProfiles++;
      }
    }

    // Insert auto-router config if none exists
    const existingConfig = await ctx.db.query("autoRouterConfig").first();
    let configInserted = false;
    if (!existingConfig) {
      await ctx.db.insert("autoRouterConfig", {
        ...DEFAULT_ROUTER_CONFIG,
        updatedAt: now,
      });
      configInserted = true;
    }

    return {
      modelsInserted: insertedModels,
      profilesInserted: insertedProfiles,
      configInserted,
      totalModels: SEED_MODELS.length,
      totalProfiles: SEED_PROFILES.length,
    };
  },
});
