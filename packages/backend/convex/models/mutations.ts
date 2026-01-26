/**
 * Model Mutations
 *
 * Write operations for DB-backed model configuration.
 * Includes history tracking for audit trail.
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

// Validators matching schema
const capabilityValidator = v.union(
  v.literal("vision"),
  v.literal("function-calling"),
  v.literal("thinking"),
  v.literal("extended-thinking"),
  v.literal("image-generation"),
);

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

const statusValidator = v.union(
  v.literal("active"),
  v.literal("deprecated"),
  v.literal("beta"),
);

const speedTierValidator = v.union(
  v.literal("ultra-fast"),
  v.literal("fast"),
  v.literal("medium"),
  v.literal("slow"),
);

const gatewayValidator = v.union(v.literal("vercel"), v.literal("openrouter"));

/**
 * Create a new model
 * Admin only - creates model and initial history entry
 */
export const create = mutation({
  args: {
    modelId: v.string(),
    provider: providerValidator,
    name: v.string(),
    description: v.optional(v.string()),
    contextWindow: v.number(),
    inputCost: v.number(),
    outputCost: v.number(),
    cachedInputCost: v.optional(v.number()),
    reasoningCost: v.optional(v.number()),
    capabilities: v.array(capabilityValidator),
    reasoningConfig: v.optional(v.string()),
    gateway: v.optional(gatewayValidator),
    hostOrder: v.optional(v.array(v.string())),
    actualModelId: v.optional(v.string()),
    isLocal: v.optional(v.boolean()),
    knowledgeCutoff: v.optional(v.string()),
    userFriendlyDescription: v.optional(v.string()),
    bestFor: v.optional(v.string()),
    benchmarks: v.optional(v.string()),
    speedTier: v.optional(speedTierValidator),
    isPro: v.optional(v.boolean()),
    isInternalOnly: v.optional(v.boolean()),
    isExperimental: v.optional(v.boolean()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Check if model ID already exists
    const existing = await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();

    if (existing) {
      throw new Error(`Model ${args.modelId} already exists`);
    }

    const now = Date.now();

    // Create model
    const modelDoc = await ctx.db.insert("models", {
      ...args,
      createdAt: now,
      updatedAt: now,
      createdBy: user._id,
      updatedBy: user._id,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: args.modelId,
      version: 1,
      changeType: "created",
      changes: [],
      snapshot: JSON.stringify(args),
      changedBy: user._id,
      changedAt: now,
    });

    return modelDoc;
  },
});

/**
 * Update an existing model
 * Admin only - updates model and creates history entry
 */
export const update = mutation({
  args: {
    id: v.id("models"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    contextWindow: v.optional(v.number()),
    inputCost: v.optional(v.number()),
    outputCost: v.optional(v.number()),
    cachedInputCost: v.optional(v.number()),
    reasoningCost: v.optional(v.number()),
    capabilities: v.optional(v.array(capabilityValidator)),
    reasoningConfig: v.optional(v.string()),
    gateway: v.optional(gatewayValidator),
    hostOrder: v.optional(v.array(v.string())),
    actualModelId: v.optional(v.string()),
    isLocal: v.optional(v.boolean()),
    knowledgeCutoff: v.optional(v.string()),
    userFriendlyDescription: v.optional(v.string()),
    bestFor: v.optional(v.string()),
    benchmarks: v.optional(v.string()),
    speedTier: v.optional(speedTierValidator),
    isPro: v.optional(v.boolean()),
    isInternalOnly: v.optional(v.boolean()),
    isExperimental: v.optional(v.boolean()),
    status: v.optional(statusValidator),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { id, reason, ...updates } = args;

    const model = await ctx.db.get(id);
    if (!model) {
      throw new Error("Model not found");
    }

    // Track changes
    const changes: Array<{
      field: string;
      oldValue?: string;
      newValue?: string;
    }> = [];

    for (const [key, newValue] of Object.entries(updates)) {
      if (newValue !== undefined) {
        const oldValue = model[key as keyof typeof model];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            field: key,
            oldValue: JSON.stringify(oldValue),
            newValue: JSON.stringify(newValue),
          });
        }
      }
    }

    if (changes.length === 0) {
      return model._id; // No changes
    }

    const now = Date.now();

    // Get latest version number
    const latestHistory = await ctx.db
      .query("modelHistory")
      .withIndex("by_modelId", (q) => q.eq("modelId", model.modelId))
      .order("desc")
      .first();

    const newVersion = (latestHistory?.version ?? 0) + 1;

    // Update model
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
      updatedBy: user._id,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: model.modelId,
      version: newVersion,
      changeType: "updated",
      changes,
      changedBy: user._id,
      changedAt: now,
      reason,
    });

    return id;
  },
});

/**
 * Deprecate a model
 * Admin only - sets status to deprecated
 */
export const deprecate = mutation({
  args: {
    id: v.id("models"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const model = await ctx.db.get(args.id);
    if (!model) {
      throw new Error("Model not found");
    }

    if (model.status === "deprecated") {
      return args.id; // Already deprecated
    }

    const now = Date.now();

    // Get latest version number
    const latestHistory = await ctx.db
      .query("modelHistory")
      .withIndex("by_modelId", (q) => q.eq("modelId", model.modelId))
      .order("desc")
      .first();

    const newVersion = (latestHistory?.version ?? 0) + 1;

    // Update model status
    await ctx.db.patch(args.id, {
      status: "deprecated",
      updatedAt: now,
      updatedBy: user._id,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: model.modelId,
      version: newVersion,
      changeType: "deprecated",
      changes: [
        {
          field: "status",
          oldValue: JSON.stringify(model.status),
          newValue: JSON.stringify("deprecated"),
        },
      ],
      changedBy: user._id,
      changedAt: now,
      reason: args.reason,
    });

    return args.id;
  },
});

/**
 * Reactivate a deprecated model
 * Admin only - sets status back to active
 */
export const reactivate = mutation({
  args: {
    id: v.id("models"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const model = await ctx.db.get(args.id);
    if (!model) {
      throw new Error("Model not found");
    }

    if (model.status === "active") {
      return args.id; // Already active
    }

    const now = Date.now();

    // Get latest version number
    const latestHistory = await ctx.db
      .query("modelHistory")
      .withIndex("by_modelId", (q) => q.eq("modelId", model.modelId))
      .order("desc")
      .first();

    const newVersion = (latestHistory?.version ?? 0) + 1;

    // Update model status
    await ctx.db.patch(args.id, {
      status: "active",
      updatedAt: now,
      updatedBy: user._id,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: model.modelId,
      version: newVersion,
      changeType: "reactivated",
      changes: [
        {
          field: "status",
          oldValue: JSON.stringify(model.status),
          newValue: JSON.stringify("active"),
        },
      ],
      changedBy: user._id,
      changedAt: now,
      reason: args.reason,
    });

    return args.id;
  },
});

/**
 * Delete a model (hard delete)
 * Admin only - use deprecate for soft delete
 */
export const remove = mutation({
  args: {
    id: v.id("models"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const model = await ctx.db.get(args.id);
    if (!model) {
      throw new Error("Model not found");
    }

    // Delete the model
    await ctx.db.delete(args.id);

    // Note: History is preserved for audit purposes

    return args.id;
  },
});

/**
 * Update model profile (category scores)
 * Admin only
 */
export const updateProfile = mutation({
  args: {
    modelId: v.string(),
    qualityScore: v.optional(v.number()),
    categoryScores: v.optional(v.string()), // JSON string
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db
      .query("modelProfiles")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.qualityScore !== undefined && {
          qualityScore: args.qualityScore,
        }),
        ...(args.categoryScores !== undefined && {
          categoryScores: args.categoryScores,
        }),
        updatedAt: now,
        updatedBy: user._id,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("modelProfiles", {
        modelId: args.modelId,
        qualityScore: args.qualityScore ?? 80,
        categoryScores: args.categoryScores ?? "{}",
        updatedAt: now,
        updatedBy: user._id,
      });
    }
  },
});

/**
 * Update auto-router configuration
 * Admin only
 */
export const updateRouterConfig = mutation({
  args: {
    stickinessBonus: v.optional(v.number()),
    reasoningBonus: v.optional(v.number()),
    researchBonus: v.optional(v.number()),
    simplePenalty: v.optional(v.number()),
    complexBoostThreshold: v.optional(v.number()),
    complexBoostMultiplier: v.optional(v.number()),
    cheapThreshold: v.optional(v.number()),
    midThreshold: v.optional(v.number()),
    tierWeights: v.optional(v.string()),
    speedBonuses: v.optional(v.string()),
    routerModelId: v.optional(v.string()),
    maxRetries: v.optional(v.number()),
    contextBuffer: v.optional(v.number()),
    longContextThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db.query("autoRouterConfig").first();
    const now = Date.now();

    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...updates,
        updatedAt: now,
        updatedBy: user._id,
      });
      return existing._id;
    } else {
      // Create with defaults + updates
      return await ctx.db.insert("autoRouterConfig", {
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
        ...updates,
        updatedAt: now,
        updatedBy: user._id,
      });
    }
  },
});

/**
 * Duplicate a model
 * Admin only - creates a copy with a new ID
 */
export const duplicate = mutation({
  args: {
    sourceId: v.id("models"),
    newModelId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source model not found");
    }

    // Check if new ID already exists
    const existing = await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.newModelId))
      .first();

    if (existing) {
      throw new Error(`Model ${args.newModelId} already exists`);
    }

    const now = Date.now();

    // Create new model (exclude Convex-specific fields)
    const {
      _id,
      _creationTime,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
      modelId: _oldModelId,
      name: _oldName,
      ...modelData
    } = source;

    const newModelDoc = await ctx.db.insert("models", {
      ...modelData,
      modelId: args.newModelId,
      name: args.newName,
      createdAt: now,
      updatedAt: now,
      createdBy: user._id,
      updatedBy: user._id,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: args.newModelId,
      version: 1,
      changeType: "created",
      changes: [],
      changedBy: user._id,
      changedAt: now,
      reason: `Duplicated from ${source.modelId}`,
    });

    return newModelDoc;
  },
});
