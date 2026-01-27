/**
 * Model CLI Internal Mutations
 *
 * Internal mutations for CLI-based model management.
 * No auth required - uses Convex deploy key authentication.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

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

// Security: Validate model IDs to prevent injection attacks
const MODEL_ID_PATTERN = /^[a-zA-Z0-9_\-:./]+$/;

function validateModelId(id: string | undefined, fieldName: string): void {
  if (!id) return;
  if (!MODEL_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid ${fieldName}: contains disallowed characters. Only alphanumeric, hyphens, underscores, colons, periods, and forward slashes are allowed.`,
    );
  }
  if (id.length > 200) {
    throw new Error(
      `Invalid ${fieldName}: exceeds maximum length of 200 characters.`,
    );
  }
}

/**
 * Create a new model via CLI
 */
export const createModel = internalMutation({
  args: {
    modelId: v.string(),
    provider: providerValidator,
    name: v.string(),
    contextWindow: v.number(),
    inputCost: v.number(),
    outputCost: v.number(),
    capabilities: v.array(capabilityValidator),
    status: statusValidator,
    // Optional fields
    description: v.optional(v.string()),
    cachedInputCost: v.optional(v.number()),
    reasoningCost: v.optional(v.number()),
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
  },
  handler: async (ctx, args) => {
    // Validate model IDs
    validateModelId(args.modelId, "modelId");
    validateModelId(args.actualModelId, "actualModelId");
    args.hostOrder?.forEach((host, i) =>
      validateModelId(host, `hostOrder[${i}]`),
    );

    // Check for duplicates
    const existing = await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();
    if (existing) {
      throw new Error(`Model ${args.modelId} already exists`);
    }

    const now = Date.now();

    // Insert model
    const modelDoc = await ctx.db.insert("models", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: args.modelId,
      version: 1,
      changeType: "created",
      changes: [],
      snapshot: JSON.stringify(args),
      changedAt: now,
      reason: "Created via CLI",
    });

    return { _id: modelDoc, modelId: args.modelId };
  },
});

/**
 * Update an existing model via CLI
 */
export const updateModel = internalMutation({
  args: {
    modelId: v.string(),
    updates: v.object({
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
    }),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate model IDs in updates
    validateModelId(args.updates.actualModelId, "actualModelId");
    args.updates.hostOrder?.forEach((host, i) =>
      validateModelId(host, `hostOrder[${i}]`),
    );

    // Find model by modelId
    const model = await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Track changes
    const changes: Array<{
      field: string;
      oldValue?: string;
      newValue?: string;
    }> = [];

    for (const [key, newValue] of Object.entries(args.updates)) {
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
      return { _id: model._id, modelId: args.modelId, changesApplied: 0 };
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
    await ctx.db.patch(model._id, {
      ...args.updates,
      updatedAt: now,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: model.modelId,
      version: newVersion,
      changeType: "updated",
      changes,
      changedAt: now,
      reason: args.reason ?? "Updated via CLI",
    });

    return {
      _id: model._id,
      modelId: args.modelId,
      changesApplied: changes.length,
    };
  },
});

/**
 * Deprecate a model via CLI
 */
export const deprecateModel = internalMutation({
  args: {
    modelId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find model by modelId
    const model = await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    if (model.status === "deprecated") {
      return {
        _id: model._id,
        modelId: args.modelId,
        alreadyDeprecated: true,
      };
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
    await ctx.db.patch(model._id, {
      status: "deprecated",
      updatedAt: now,
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
      changedAt: now,
      reason: args.reason ?? "Deprecated via CLI",
    });

    return { _id: model._id, modelId: args.modelId, deprecated: true };
  },
});

/**
 * List models via CLI
 */
export const listModels = internalQuery({
  args: {
    provider: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let models;

    if (args.provider && args.status) {
      // Use composite index
      models = await ctx.db
        .query("models")
        .withIndex("by_provider_status", (q) =>
          q
            .eq(
              "provider",
              args.provider as
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
                | "zhipu",
            )
            .eq("status", args.status as "active" | "deprecated" | "beta"),
        )
        .collect();
    } else if (args.provider) {
      models = await ctx.db
        .query("models")
        .withIndex("by_provider", (q) =>
          q.eq(
            "provider",
            args.provider as
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
              | "zhipu",
          ),
        )
        .collect();
    } else if (args.status) {
      models = await ctx.db
        .query("models")
        .withIndex("by_status", (q) =>
          q.eq("status", args.status as "active" | "deprecated" | "beta"),
        )
        .collect();
    } else {
      models = await ctx.db.query("models").collect();
    }

    // Return simplified view for CLI output
    return models.map((m) => ({
      modelId: m.modelId,
      name: m.name,
      provider: m.provider,
      status: m.status,
      inputCost: m.inputCost,
      outputCost: m.outputCost,
      contextWindow: m.contextWindow,
      capabilities: m.capabilities,
    }));
  },
});

/**
 * Get a single model by ID via CLI
 */
export const getModel = internalQuery({
  args: {
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const model = await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      return null;
    }

    return model;
  },
});
