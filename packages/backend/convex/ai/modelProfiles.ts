/**
 * Model Profiles for Auto Router
 *
 * Contains model configurations, task categories, and scoring profiles
 * used by the auto router to select optimal models.
 */

// ============================================================================
// Types
// ============================================================================

export interface RouterPreferences {
  costBias: number; // 0-100: higher = prefer cheaper models
  speedBias: number; // 0-100: higher = prefer faster models
}

export interface TaskClassification {
  primaryCategory: TaskCategoryId;
  secondaryCategory?: TaskCategoryId;
  complexity: "simple" | "moderate" | "complex";
  requiresVision: boolean;
  requiresLongContext: boolean;
  requiresReasoning: boolean;
  confidence: number;
}

export interface RouterResult {
  selectedModelId: string;
  classification: TaskClassification;
  reasoning: string;
  candidatesConsidered: number;
  explorationPick?: boolean;
}

export type TaskCategoryId =
  | "coding"
  | "reasoning"
  | "creative"
  | "factual"
  | "analysis"
  | "conversation"
  | "multimodal"
  | "research";

// ============================================================================
// Constants
// ============================================================================

export const TASK_CATEGORIES: TaskCategoryId[] = [
  "coding",
  "reasoning",
  "creative",
  "factual",
  "analysis",
  "conversation",
  "multimodal",
  "research",
];

// ============================================================================
// Model Configuration (subset needed for routing)
// ============================================================================

export interface ModelConfigForRouter {
  id: string;
  name: string;
  contextWindow: number;
  pricing: { input: number; output: number };
  capabilities: string[];
  isInternalOnly?: boolean;
  hostOrder?: string[];
}

/**
 * Simplified MODEL_CONFIG for the router.
 * Contains only the fields needed for routing decisions.
 */
export const MODEL_CONFIG: Record<string, ModelConfigForRouter> = {
  // OpenAI GPT-5 Series
  "openai:gpt-5": {
    id: "openai:gpt-5",
    name: "GPT-5",
    contextWindow: 200000,
    pricing: { input: 2.5, output: 10.0 },
    capabilities: ["thinking", "vision", "function-calling"],
  },
  "openai:gpt-5-mini": {
    id: "openai:gpt-5-mini",
    name: "GPT-5 Mini",
    contextWindow: 200000,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-5-nano": {
    id: "openai:gpt-5-nano",
    name: "GPT-5 Nano",
    contextWindow: 200000,
    pricing: { input: 0.04, output: 0.16 },
    capabilities: ["function-calling"],
  },

  // OpenAI GPT-5.1 Series
  "openai:gpt-5.1": {
    id: "openai:gpt-5.1",
    name: "GPT-5.1",
    contextWindow: 256000,
    pricing: { input: 1.25, output: 10.0 },
    capabilities: ["thinking", "vision", "function-calling"],
  },
  "openai:gpt-5.1-codex": {
    id: "openai:gpt-5.1-codex",
    name: "GPT-5.1 Codex",
    contextWindow: 256000,
    pricing: { input: 1.25, output: 10.0 },
    capabilities: ["thinking", "function-calling"],
  },
  "openai:gpt-5.1-instant": {
    id: "openai:gpt-5.1-instant",
    name: "GPT-5.1 Instant",
    contextWindow: 128000,
    pricing: { input: 0.25, output: 2.0 },
    capabilities: ["vision", "function-calling"],
  },

  // OpenAI GPT-5.2 Series
  "openai:gpt-5.2": {
    id: "openai:gpt-5.2",
    name: "GPT-5.2",
    contextWindow: 500000,
    pricing: { input: 0.6, output: 4.8 },
    capabilities: ["thinking", "vision", "function-calling"],
  },

  // Anthropic Claude
  "anthropic:claude-sonnet-4": {
    id: "anthropic:claude-sonnet-4",
    name: "Claude Sonnet 4",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["vision", "function-calling", "extended-thinking"],
  },
  "anthropic:claude-opus-4": {
    id: "anthropic:claude-opus-4",
    name: "Claude Opus 4",
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0 },
    capabilities: ["vision", "function-calling", "extended-thinking"],
  },
  "anthropic:claude-3.5-haiku": {
    id: "anthropic:claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    contextWindow: 200000,
    pricing: { input: 0.8, output: 4.0 },
    capabilities: ["vision", "function-calling"],
  },

  // Google Gemini
  "google:gemini-2.5-pro": {
    id: "google:gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    contextWindow: 1048576,
    pricing: { input: 1.25, output: 10.0 },
    capabilities: ["vision", "function-calling", "thinking"],
  },
  "google:gemini-2.5-flash": {
    id: "google:gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    contextWindow: 1048576,
    pricing: { input: 0.075, output: 0.3 },
    capabilities: ["vision", "function-calling", "thinking"],
  },
  "google:gemini-2.0-flash": {
    id: "google:gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    contextWindow: 1048576,
    pricing: { input: 0.1, output: 0.4 },
    capabilities: ["vision", "function-calling"],
  },

  // xAI Grok
  "xai:grok-3": {
    id: "xai:grok-3",
    name: "Grok 3",
    contextWindow: 131072,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["vision", "function-calling", "thinking"],
  },
  "xai:grok-3-mini": {
    id: "xai:grok-3-mini",
    name: "Grok 3 Mini",
    contextWindow: 131072,
    pricing: { input: 0.3, output: 0.5 },
    capabilities: ["vision", "function-calling", "thinking"],
  },

  // Perplexity (Research)
  "perplexity:sonar-pro": {
    id: "perplexity:sonar-pro",
    name: "Sonar Pro",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["function-calling"],
  },
  "perplexity:sonar": {
    id: "perplexity:sonar",
    name: "Sonar",
    contextWindow: 128000,
    pricing: { input: 1.0, output: 1.0 },
    capabilities: ["function-calling"],
  },

  // DeepSeek
  "deepseek:deepseek-r1": {
    id: "deepseek:deepseek-r1",
    name: "DeepSeek R1",
    contextWindow: 128000,
    pricing: { input: 0.55, output: 2.19 },
    capabilities: ["function-calling", "thinking"],
  },
  "deepseek:deepseek-chat": {
    id: "deepseek:deepseek-chat",
    name: "DeepSeek Chat",
    contextWindow: 128000,
    pricing: { input: 0.14, output: 0.28 },
    capabilities: ["function-calling"],
  },

  // Meta Llama (via Cerebras/Groq)
  "meta:llama-4-maverick": {
    id: "meta:llama-4-maverick",
    name: "Llama 4 Maverick",
    contextWindow: 1048576,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: ["vision", "function-calling"],
    hostOrder: ["cerebras", "groq"],
  },
  "meta:llama-4-scout": {
    id: "meta:llama-4-scout",
    name: "Llama 4 Scout",
    contextWindow: 524288,
    pricing: { input: 0.1, output: 0.25 },
    capabilities: ["vision", "function-calling"],
    hostOrder: ["cerebras", "groq"],
  },
  "meta:llama-3.3-70b": {
    id: "meta:llama-3.3-70b",
    name: "Llama 3.3 70B",
    contextWindow: 131072,
    pricing: { input: 0.6, output: 0.6 },
    capabilities: ["function-calling"],
    hostOrder: ["cerebras", "groq"],
  },

  // Internal-only models (excluded from routing)
  "openai:gpt-oss-120b": {
    id: "openai:gpt-oss-120b",
    name: "GPT-OSS 120B",
    contextWindow: 32000,
    pricing: { input: 0.05, output: 0.1 },
    capabilities: [],
    isInternalOnly: true,
    hostOrder: ["cerebras"],
  },
};

// ============================================================================
// Model Profiles (scoring by task category)
// ============================================================================

export interface ModelProfile {
  modelId: string;
  qualityScore: number; // 0-100 overall quality rating
  categoryScores: Partial<Record<TaskCategoryId, number>>; // 0-100 per category
}

/**
 * Model profiles with category-specific scores.
 * Higher scores = better fit for that task category.
 */
export const MODEL_PROFILES: Record<string, ModelProfile> = {
  // GPT-5 Series
  "openai:gpt-5": {
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
  "openai:gpt-5-mini": {
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
  "openai:gpt-5-nano": {
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

  // GPT-5.1 Series
  "openai:gpt-5.1": {
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
  "openai:gpt-5.1-codex": {
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
  "openai:gpt-5.1-instant": {
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

  // GPT-5.2
  "openai:gpt-5.2": {
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

  // Claude
  "anthropic:claude-sonnet-4": {
    modelId: "anthropic:claude-sonnet-4",
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
  "anthropic:claude-opus-4": {
    modelId: "anthropic:claude-opus-4",
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
  "anthropic:claude-3.5-haiku": {
    modelId: "anthropic:claude-3.5-haiku",
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

  // Gemini
  "google:gemini-2.5-pro": {
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
  "google:gemini-2.5-flash": {
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
  "google:gemini-2.0-flash": {
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

  // Grok
  "xai:grok-3": {
    modelId: "xai:grok-3",
    qualityScore: 92,
    categoryScores: {
      coding: 90,
      reasoning: 92,
      creative: 88,
      factual: 85,
      analysis: 90,
      conversation: 88,
      multimodal: 85,
      research: 82,
    },
  },
  "xai:grok-3-mini": {
    modelId: "xai:grok-3-mini",
    qualityScore: 78,
    categoryScores: {
      coding: 75,
      reasoning: 78,
      creative: 75,
      factual: 82,
      analysis: 75,
      conversation: 85,
      multimodal: 72,
      research: 75,
    },
  },

  // Perplexity (research-focused)
  "perplexity:sonar-pro": {
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
  "perplexity:sonar": {
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

  // DeepSeek
  "deepseek:deepseek-r1": {
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
  "deepseek:deepseek-chat": {
    modelId: "deepseek:deepseek-chat",
    qualityScore: 82,
    categoryScores: {
      coding: 85,
      reasoning: 78,
      creative: 78,
      factual: 85,
      analysis: 80,
      conversation: 82,
      multimodal: 50,
      research: 65,
    },
  },

  // Llama
  "meta:llama-4-maverick": {
    modelId: "meta:llama-4-maverick",
    qualityScore: 88,
    categoryScores: {
      coding: 85,
      reasoning: 82,
      creative: 85,
      factual: 85,
      analysis: 82,
      conversation: 88,
      multimodal: 85,
      research: 70,
    },
  },
  "meta:llama-4-scout": {
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
  "meta:llama-3.3-70b": {
    modelId: "meta:llama-3.3-70b",
    qualityScore: 80,
    categoryScores: {
      coding: 82,
      reasoning: 78,
      creative: 78,
      factual: 82,
      analysis: 78,
      conversation: 85,
      multimodal: 50,
      research: 65,
    },
  },
};
