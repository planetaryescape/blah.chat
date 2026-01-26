/**
 * AI Model Management Schema
 *
 * Database-backed model configuration for dynamic model management.
 * Enables admins to add/edit/deprecate models without code deploys.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Provider union matching packages/ai/src/types.ts
 */
const providerValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("google"),
  v.literal("xai"),
  v.literal("perplexity"),
  v.literal("groq"),
  v.literal("cerebras"),
  v.literal("minimax"),
  v.literal("deepseek"),
  v.literal("kimi"),
  v.literal("zai"),
  v.literal("meta"),
  v.literal("mistral"),
  v.literal("alibaba"),
  v.literal("zhipu"),
);

/**
 * Capability union matching packages/ai/src/types.ts
 */
const capabilityValidator = v.union(
  v.literal("vision"),
  v.literal("function-calling"),
  v.literal("thinking"),
  v.literal("extended-thinking"),
  v.literal("image-generation"),
);

/**
 * Speed tier classification
 */
const speedTierValidator = v.union(
  v.literal("ultra-fast"),
  v.literal("fast"),
  v.literal("medium"),
  v.literal("slow"),
);

/**
 * Gateway/SDK for routing requests
 */
const gatewayValidator = v.union(v.literal("vercel"), v.literal("openrouter"));

/**
 * Model status for lifecycle management
 */
const statusValidator = v.union(
  v.literal("active"),
  v.literal("deprecated"),
  v.literal("beta"),
);

/**
 * Models table - stores all AI model configurations
 *
 * Replaces static MODEL_CONFIG from packages/ai/src/models.ts
 */
export const modelsTable = defineTable({
  // Identity (unique across all models)
  modelId: v.string(), // "openai:gpt-5", "anthropic:claude-opus-4.5"
  provider: providerValidator,
  name: v.string(), // "GPT-5", "Claude 4.5 Opus"
  description: v.optional(v.string()),

  // Context
  contextWindow: v.number(),
  actualModelId: v.optional(v.string()), // Override for API calls
  isLocal: v.optional(v.boolean()), // Ollama models

  // Pricing (per 1M tokens, USD)
  inputCost: v.number(),
  outputCost: v.number(),
  cachedInputCost: v.optional(v.number()),
  reasoningCost: v.optional(v.number()),

  // Capabilities (as array for flexibility)
  capabilities: v.array(capabilityValidator),

  // Reasoning configuration (JSON string for complex nested structure)
  reasoningConfig: v.optional(v.string()),

  // Gateway/routing
  gateway: v.optional(gatewayValidator),
  hostOrder: v.optional(v.array(v.string())), // Fallback hosts

  // User-facing metadata
  knowledgeCutoff: v.optional(v.string()), // "April 2025", "Real-time search"
  userFriendlyDescription: v.optional(v.string()),
  bestFor: v.optional(v.string()),

  // Benchmark scores (JSON string for BenchmarkScores object)
  benchmarks: v.optional(v.string()),
  speedTier: v.optional(speedTierValidator),

  // Access control
  isPro: v.optional(v.boolean()), // Requires tier access
  isInternalOnly: v.optional(v.boolean()), // Hidden from model picker
  isExperimental: v.optional(v.boolean()), // Preview/beta

  // Status
  status: statusValidator,

  // Audit fields
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.optional(v.id("users")),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_modelId", ["modelId"])
  .index("by_provider", ["provider"])
  .index("by_status", ["status"])
  .index("by_provider_status", ["provider", "status"])
  .searchIndex("search_models", {
    searchField: "name",
    filterFields: ["provider", "status"],
  });

/**
 * Change type for model history tracking
 */
const changeTypeValidator = v.union(
  v.literal("created"),
  v.literal("updated"),
  v.literal("deprecated"),
  v.literal("reactivated"),
);

/**
 * Model History table - tracks all changes to models
 *
 * Enables audit trail and rollback capabilities
 */
export const modelHistoryTable = defineTable({
  modelId: v.string(), // References models.modelId
  version: v.number(), // Incrementing version number

  changeType: changeTypeValidator,

  // Field-level changes (for updates)
  changes: v.array(
    v.object({
      field: v.string(),
      oldValue: v.optional(v.string()), // JSON stringified
      newValue: v.optional(v.string()), // JSON stringified
    }),
  ),

  // Full snapshot (for rollback)
  snapshot: v.optional(v.string()), // JSON stringified full model config

  // Audit
  changedBy: v.optional(v.id("users")),
  changedAt: v.number(),
  reason: v.optional(v.string()), // Admin notes
})
  .index("by_modelId", ["modelId"])
  .index("by_modelId_version", ["modelId", "version"])
  .index("by_changedAt", ["changedAt"]);

/**
 * Auto-Router Configuration table (singleton)
 *
 * Stores all tunable parameters for the auto-router.
 * Single row - use getRouterConfig() to fetch.
 */
export const autoRouterConfigTable = defineTable({
  // Scoring bonuses
  stickinessBonus: v.number(), // default: 25
  reasoningBonus: v.number(), // default: 15
  researchBonus: v.number(), // default: 25

  // Complexity multipliers
  simplePenalty: v.number(), // default: 0.7
  complexBoostThreshold: v.number(), // default: 85
  complexBoostMultiplier: v.number(), // default: 1.2

  // Cost tier boundaries (avgCost thresholds)
  cheapThreshold: v.number(), // default: 1.0
  midThreshold: v.number(), // default: 5.0

  // Tier weights by complexity (JSON string)
  // { simple: { cheap: 0.6, mid: 0.25, premium: 0.15 }, ... }
  tierWeights: v.string(),

  // Speed bonuses (JSON string)
  // { cerebras: 12, groq: 10, flash: 8, ... }
  speedBonuses: v.string(),

  // Router settings
  routerModelId: v.string(), // default: "openai:gpt-oss-120b"
  maxRetries: v.number(), // default: 3
  contextBuffer: v.number(), // default: 1.2 (20% margin)
  longContextThreshold: v.number(), // default: 128000

  // Audit
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
});

/**
 * Model Profiles table - category scores per model
 *
 * Stores how well each model performs at different task types.
 * Used by auto-router for intelligent model selection.
 */
export const modelProfilesTable = defineTable({
  modelId: v.string(), // References models.modelId

  // Overall quality score (0-100)
  qualityScore: v.number(),

  // Category scores (JSON string)
  // { coding: 85, reasoning: 90, creative: 75, factual: 88, ... }
  categoryScores: v.string(),

  // Audit
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_modelId", ["modelId"])
  .index("by_qualityScore", ["qualityScore"]);
