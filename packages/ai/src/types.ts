import type { LucideIcon } from "lucide-react";
import type { ModelConfig } from "./models";

/**
 * Benchmark scores for model capabilities
 * All scores normalized to 0-100 scale
 */
export interface BenchmarkScores {
  /** Intelligence score from AIME 2025, GPQA Diamond benchmarks */
  intelligence?: number;
  /** Coding ability from SWE-bench Verified */
  coding?: number;
  /** Reasoning capability from complex multi-step tasks */
  reasoning?: number;
}

/**
 * Speed tier classification based on tokens per second
 * - ultra-fast: >500 TPS (Cerebras, SambaNova)
 * - fast: 200-500 TPS (Groq, Gemini Flash)
 * - medium: 50-200 TPS (Standard cloud providers)
 * - slow: <50 TPS (Basic deployments, reasoning models)
 */
export type SpeedTier = "ultra-fast" | "fast" | "medium" | "slow";

/**
 * Cost tier based on average cost per million tokens
 * - budget: <$1/M
 * - balanced: $1-10/M
 * - premium: >$10/M
 */
export type CostTier = "budget" | "balanced" | "premium";

/**
 * Computed metrics for a model
 * Includes both real benchmarks and estimated values
 */
export interface ComputedMetrics {
  /** Speed classification */
  speedTier: SpeedTier;
  /** Actual tokens per second if known */
  speedTps?: number;
  /** Cost classification */
  costTier: CostTier;
  /** Average cost per million tokens (input + output) / 2 */
  costPerMillion: number;
  /** Intelligence percentile (0-100) compared to all models */
  intelligencePercentile?: number;
  /** Coding percentile (0-100) compared to all models */
  codingPercentile?: number;
  /** Reasoning percentile (0-100) compared to all models */
  reasoningPercentile?: number;
  /** True if model has public benchmark data, false if estimated */
  hasPublicBenchmarks: boolean;
}

/**
 * Category definition for filtering models
 */
export interface ModelCategory {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon component */
  icon?: LucideIcon;
  /** Filter function to determine if model belongs to category */
  filter: (model: ModelConfig) => boolean;
  /** Optional description */
  description?: string;
}
