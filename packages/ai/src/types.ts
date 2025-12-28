/**
 * Shared AI model types for web and mobile
 */

export type Provider =
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

export type Capability =
  | "vision"
  | "function-calling"
  | "thinking"
  | "extended-thinking"
  | "image-generation";

export interface ModelConfig {
  id: string;
  provider: Provider;
  name: string;
  description?: string;
  contextWindow: number;
  pricing: {
    input: number;
    output: number;
    cached?: number;
    reasoning?: number;
  };
  capabilities: Capability[];
  isLocal?: boolean;
  actualModelId?: string;
  isExperimental?: boolean;
  knowledgeCutoff?: string;
  userFriendlyDescription?: string;
  bestFor?: string;
  isPro?: boolean;
  isInternalOnly?: boolean;
}

export type SpeedTier = "instant" | "fast" | "standard" | "slow";
export type CostTier = "free" | "budget" | "standard" | "premium";
export type ModelTier = "flagship" | "reasoning" | "fast" | "free";
