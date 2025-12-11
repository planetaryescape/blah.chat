import type { ModelConfig } from "./models";
import type { BenchmarkScores, ComputedMetrics, CostTier, SpeedTier } from "./types";

/**
 * Tier 1: Hardcoded benchmark data for flagship models
 * Sources:
 * - SWE-bench Verified (coding)
 * - AIME 2025 (intelligence)
 * - GPQA Diamond (reasoning)
 * All scores normalized to 0-100 scale
 */
export const BENCHMARK_DATA: Record<string, BenchmarkScores> = {
  // OpenAI
  "openai:gpt-5": { intelligence: 94, coding: 85, reasoning: 88 },
  "openai:gpt-5-mini": { intelligence: 75, coding: 68, reasoning: 70 },
  "openai:gpt-5-nano": { intelligence: 65, coding: 60, reasoning: 62 },
  "openai:gpt-4o": { intelligence: 88, coding: 75, reasoning: 82 },
  "openai:o1": { intelligence: 92, coding: 82, reasoning: 90 },
  "openai:o1-mini": { intelligence: 85, coding: 72, reasoning: 83 },
  "openai:o3-mini": { intelligence: 82, coding: 70, reasoning: 80 },

  // Anthropic
  "anthropic:claude-opus-4.5": { intelligence: 95, coding: 81, reasoning: 90 },
  "anthropic:claude-3.5-sonnet": { intelligence: 88, coding: 78, reasoning: 85 },
  "anthropic:claude-3.5-haiku": { intelligence: 75, coding: 68, reasoning: 72 },

  // Google
  "google:gemini-2.5-pro": { intelligence: 86, coding: 72, reasoning: 84 },
  "google:gemini-2.5-flash": { intelligence: 85, coding: 70, reasoning: 82 },
  "google:gemini-1.5-pro": { intelligence: 84, coding: 70, reasoning: 80 },
  "google:gemini-1.5-flash": { intelligence: 78, coding: 65, reasoning: 75 },
  "google:gemini-2.0-flash-thinking": { intelligence: 87, coding: 73, reasoning: 85 },

  // xAI
  "xai:grok-4": { intelligence: 100, coding: 75, reasoning: 88 },
  "xai:grok-4-fast": { intelligence: 92, coding: 72, reasoning: 85 },
  "xai:grok-3": { intelligence: 88, coding: 70, reasoning: 82 },

  // DeepSeek
  "deepseek:deepseek-v3": { intelligence: 87, coding: 78, reasoning: 85 },
  "deepseek:deepseek-r1": { intelligence: 90, coding: 80, reasoning: 88 },

  // Meta
  "meta:llama-3.3-70b": { intelligence: 78, coding: 72, reasoning: 75 },
  "meta:llama-3.1-405b": { intelligence: 82, coding: 75, reasoning: 78 },
  "meta:llama-3.1-70b": { intelligence: 76, coding: 70, reasoning: 73 },
};

/**
 * Speed tier mapping based on provider/model characteristics
 * Sources: Groq, Cerebras benchmarks, provider documentation
 */
const SPEED_TIERS: Record<string, { tier: SpeedTier; tps?: number }> = {
  // Ultra-fast inference (>500 TPS)
  cerebras: { tier: "ultra-fast", tps: 2522 },
  sambanova: { tier: "ultra-fast", tps: 794 },

  // Fast inference (200-500 TPS)
  groq: { tier: "fast", tps: 549 },

  // Specific fast models
  "gemini-2.5-flash": { tier: "fast" },
  "gemini-2.0-flash": { tier: "fast" },
  "gemini-1.5-flash": { tier: "fast" },
  "gpt-5-nano": { tier: "fast" },
  "gpt-4o-mini": { tier: "fast" },
  "claude-3.5-haiku": { tier: "fast" },
  "claude-haiku": { tier: "fast" },

  // Reasoning models (slower due to thinking)
  "o1": { tier: "slow" },
  "o1-mini": { tier: "slow" },
  "o3-mini": { tier: "slow" },
  "deepseek-r1": { tier: "slow" },
  "gemini-2.0-flash-thinking": { tier: "medium" }, // Fast but with thinking
};

/**
 * Provider-level intelligence averages for estimation
 */
const PROVIDER_AVERAGES: Record<string, number> = {
  openai: 85,
  anthropic: 80,
  google: 75,
  xai: 85,
  deepseek: 82,
  meta: 75,
  mistral: 72,
  perplexity: 70,
  groq: 70, // Inference provider, uses open models
  cerebras: 70,
  alibaba: 68,
  minimax: 68,
  zhipu: 68,
  kimi: 70,
  zai: 68,
};

/**
 * Model tier multipliers based on name suffix
 */
const TIER_MULTIPLIERS: Record<string, number> = {
  mini: 0.7,
  nano: 0.6,
  haiku: 0.75,
  flash: 0.85,
  base: 1.0,
  pro: 1.2,
  opus: 1.25,
  ultra: 1.3,
};

/**
 * Get benchmark scores for a model using 3-tier fallback
 */
export function getBenchmarkScores(model: ModelConfig): BenchmarkScores {
  // Tier 1: Check hardcoded data
  const hardcoded = BENCHMARK_DATA[model.id];
  if (hardcoded) {
    return hardcoded;
  }

  // Tier 2: Estimate based on provider and model tier
  const provider = model.provider;
  const providerAvg = PROVIDER_AVERAGES[provider] || 70;

  // Detect tier from model name
  let multiplier = 1.0;
  const lowerName = model.name.toLowerCase();
  for (const [tier, mult] of Object.entries(TIER_MULTIPLIERS)) {
    if (lowerName.includes(tier)) {
      multiplier = mult;
      break;
    }
  }

  let intelligence = Math.round(providerAvg * multiplier);
  let coding = Math.round(providerAvg * multiplier * 0.9); // Coding slightly lower
  let reasoning = Math.round(providerAvg * multiplier * 0.95);

  // Tier 3: Adjust based on capabilities
  if (model.capabilities.includes("extended-thinking")) {
    reasoning += 15;
    intelligence += 10;
  }
  if (model.capabilities.includes("thinking")) {
    reasoning += 10;
    intelligence += 5;
  }
  if (model.capabilities.includes("vision")) {
    // Vision models typically mid-tier
    intelligence = Math.min(intelligence, 85);
  }
  if (model.isLocal) {
    // Local models typically lower benchmarks
    intelligence = Math.min(intelligence, 75);
    coding = Math.min(coding, 70);
  }

  // Clamp to 0-100 range
  return {
    intelligence: Math.max(0, Math.min(100, intelligence)),
    coding: Math.max(0, Math.min(100, coding)),
    reasoning: Math.max(0, Math.min(100, reasoning)),
  };
}

/**
 * Determine speed tier for a model
 */
function getSpeedTier(model: ModelConfig): { tier: SpeedTier; tps?: number } {
  // Check provider-level speed
  const providerSpeed = SPEED_TIERS[model.provider];
  if (providerSpeed) {
    return providerSpeed;
  }

  // Check model-specific speed (by name fragment)
  const lowerName = model.name.toLowerCase();
  const lowerID = model.id.toLowerCase();

  for (const [key, speed] of Object.entries(SPEED_TIERS)) {
    if (lowerName.includes(key) || lowerID.includes(key)) {
      return speed;
    }
  }

  // Default: reasoning models slow, local models medium, others medium
  if (model.capabilities.includes("extended-thinking")) {
    return { tier: "slow" };
  }
  if (model.capabilities.includes("thinking") && !lowerName.includes("flash")) {
    return { tier: "slow" };
  }
  if (model.isLocal) {
    return { tier: "medium" };
  }

  return { tier: "medium" }; // Safe default
}

/**
 * Calculate cost tier based on pricing
 */
function getCostTier(model: ModelConfig): { tier: CostTier; avgCost: number } {
  if (model.isLocal) {
    return { tier: "budget", avgCost: 0 };
  }

  const avgCost = (model.pricing.input + model.pricing.output) / 2;

  if (avgCost < 1) {
    return { tier: "budget", avgCost };
  }
  if (avgCost < 10) {
    return { tier: "balanced", avgCost };
  }
  return { tier: "premium", avgCost };
}

/**
 * Compute percentile for a score among all models
 * @param score The score to rank
 * @param allScores Array of all scores to compare against
 * @returns Percentile (0-100)
 */
function computePercentile(score: number | undefined, allScores: number[]): number | undefined {
  if (score === undefined || allScores.length === 0) {
    return undefined;
  }

  const validScores = allScores.filter((s) => s !== undefined && s > 0);
  if (validScores.length === 0) {
    return undefined;
  }

  const sortedScores = [...validScores].sort((a, b) => a - b);
  const rank = sortedScores.filter((s) => s < score).length;
  return Math.round((rank / sortedScores.length) * 100);
}

/**
 * Compute all metrics for a model
 * This is the main function that orchestrates all calculations
 */
export function computeModelMetrics(
  model: ModelConfig,
  allModels?: ModelConfig[],
): ComputedMetrics {
  // Get benchmark scores (real or estimated)
  const scores = getBenchmarkScores(model);
  const hasPublicBenchmarks = BENCHMARK_DATA[model.id] !== undefined;

  // Get speed tier
  const { tier: speedTier, tps: speedTps } = getSpeedTier(model);

  // Get cost tier
  const { tier: costTier, avgCost: costPerMillion } = getCostTier(model);

  // Compute percentiles if allModels provided
  let intelligencePercentile: number | undefined;
  let codingPercentile: number | undefined;
  let reasoningPercentile: number | undefined;

  if (allModels) {
    const allIntelligence = allModels.map((m) => getBenchmarkScores(m).intelligence!);
    const allCoding = allModels.map((m) => getBenchmarkScores(m).coding!);
    const allReasoning = allModels.map((m) => getBenchmarkScores(m).reasoning!);

    intelligencePercentile = computePercentile(scores.intelligence, allIntelligence);
    codingPercentile = computePercentile(scores.coding, allCoding);
    reasoningPercentile = computePercentile(scores.reasoning, allReasoning);
  }

  return {
    speedTier,
    speedTps,
    costTier,
    costPerMillion,
    intelligencePercentile,
    codingPercentile,
    reasoningPercentile,
    hasPublicBenchmarks,
  };
}

/**
 * Get comparative text for intelligence
 */
export function getIntelligenceText(percentile: number | undefined): string {
  if (percentile === undefined) {
    return "Competitive";
  }
  if (percentile >= 95) return "Top 5%";
  if (percentile >= 90) return "Top 10%";
  if (percentile >= 75) return "Top 25%";
  if (percentile >= 60) return "Above average";
  return "Competitive";
}

/**
 * Get comparative text for speed
 */
export function getSpeedText(metrics: ComputedMetrics): string {
  const { speedTier, speedTps } = metrics;

  if (speedTps) {
    return `${speedTps.toLocaleString()} TPS`;
  }

  switch (speedTier) {
    case "ultra-fast":
      return "Instant (simple tasks)";
    case "fast":
      return "Quick responses";
    case "medium":
      return "Standard speed";
    case "slow":
      return "Slower (deep thinking)";
  }
}

/**
 * Get comparative text for cost
 */
export function getCostText(metrics: ComputedMetrics): string {
  const { costTier, costPerMillion } = metrics;

  if (costPerMillion === 0) {
    return "Free (local)";
  }

  const formatted = `$${costPerMillion.toFixed(2)}/M avg`;

  switch (costTier) {
    case "budget":
      return `${formatted} (Best for volume)`;
    case "balanced":
      return `${formatted} (Moderate cost)`;
    case "premium":
      return `${formatted} (Complex tasks only)`;
  }
}
