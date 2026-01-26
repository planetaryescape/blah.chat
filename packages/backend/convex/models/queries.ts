/**
 * Model Queries
 *
 * Read operations for DB-backed model configuration.
 * These queries provide reactive data for the model picker,
 * generation, and admin UI.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get a model by its ID (e.g., "openai:gpt-5")
 */
export const getById = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();
  },
});

/**
 * Get all active models
 * Excludes deprecated models unless includeDeprecated is true
 */
export const list = query({
  args: {
    includeDeprecated: v.optional(v.boolean()),
    includeInternalOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let models = await ctx.db
      .query("models")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    if (args.includeDeprecated) {
      const deprecated = await ctx.db
        .query("models")
        .withIndex("by_status", (q) => q.eq("status", "deprecated"))
        .collect();
      const beta = await ctx.db
        .query("models")
        .withIndex("by_status", (q) => q.eq("status", "beta"))
        .collect();
      models = [...models, ...deprecated, ...beta];
    }

    // Filter out internal-only models unless requested
    if (!args.includeInternalOnly) {
      models = models.filter((m) => !m.isInternalOnly);
    }

    return models;
  },
});

/**
 * Get models by provider
 */
export const byProvider = query({
  args: {
    provider: v.string(),
    includeDeprecated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const models = await ctx.db
      .query("models")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider as any))
      .collect();

    if (args.includeDeprecated) {
      return models;
    }

    return models.filter((m) => m.status === "active" || m.status === "beta");
  },
});

/**
 * Search models by name
 */
export const search = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const results = await ctx.db
      .query("models")
      .withSearchIndex("search_models", (q) =>
        q.search("name", args.searchTerm),
      )
      .take(limit);

    return results;
  },
});

/**
 * Get all models (for admin)
 * Returns all models including deprecated and internal-only
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("models").collect();
  },
});

/**
 * Get model profile by model ID
 */
export const getProfile = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modelProfiles")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();
  },
});

/**
 * Get all model profiles
 */
export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("modelProfiles").collect();
  },
});

/**
 * Get auto-router configuration
 * Returns the singleton config row
 */
export const getRouterConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("autoRouterConfig").first();
  },
});

/**
 * Get model history for a specific model
 */
export const getHistory = query({
  args: {
    modelId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("modelHistory")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get recent model changes (for admin dashboard)
 */
export const getRecentChanges = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("modelHistory")
      .withIndex("by_changedAt")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get model count by status
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allModels = await ctx.db.query("models").collect();

    const byStatus = {
      active: 0,
      deprecated: 0,
      beta: 0,
    };

    const byProvider: Record<string, number> = {};

    for (const model of allModels) {
      byStatus[model.status]++;
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
    }

    return {
      total: allModels.length,
      byStatus,
      byProvider,
    };
  },
});
