import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// ===== Public Queries =====

/**
 * Get current BYOK config for authenticated user
 * Returns enabled status and which keys are configured (never the actual keys)
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const config = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return null;

    // Never return encrypted keys - only return which keys are configured
    return {
      _id: config._id,
      byokEnabled: config.byokEnabled,
      hasVercelGatewayKey: !!config.encryptedVercelGatewayKey,
      hasOpenRouterKey: !!config.encryptedOpenRouterKey,
      hasGroqKey: !!config.encryptedGroqKey,
      hasDeepgramKey: !!config.encryptedDeepgramKey,
      lastValidated: config.lastValidated,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  },
});

// ===== Public Mutations =====

/**
 * Enable BYOK (requires at least Vercel Gateway key to be saved first)
 */
export const enable = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const config = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config || !config.encryptedVercelGatewayKey) {
      throw new Error("Vercel AI Gateway key required to enable BYOK");
    }

    await ctx.db.patch(config._id, {
      byokEnabled: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Disable BYOK (keeps keys for potential re-enable)
 */
export const disable = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const config = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return { success: true };

    await ctx.db.patch(config._id, {
      byokEnabled: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a specific API key
 */
export const removeKey = mutation({
  args: {
    keyType: v.union(
      v.literal("vercelGateway"),
      v.literal("openRouter"),
      v.literal("groq"),
      v.literal("deepgram"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const config = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return { success: true };

    // Map key type to field name
    const fieldMap = {
      vercelGateway: "encryptedVercelGatewayKey",
      openRouter: "encryptedOpenRouterKey",
      groq: "encryptedGroqKey",
      deepgram: "encryptedDeepgramKey",
    } as const;

    const field = fieldMap[args.keyType];

    // If removing Vercel key and BYOK is enabled, disable BYOK first
    if (args.keyType === "vercelGateway" && config.byokEnabled) {
      await ctx.db.patch(config._id, {
        byokEnabled: false,
        [field]: undefined,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(config._id, {
        [field]: undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ===== Internal Queries =====

/**
 * Get config internal (full record with encrypted keys)
 * For use by actions that need to decrypt keys
 */
export const getConfigInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"userApiKeys"> | null> => {
    return await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get config by authenticated user (for internal use)
 */
export const getConfigByAuth = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"userApiKeys"> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

// ===== Internal Mutations =====

/**
 * Create or update config (called from saveCredentials action)
 */
export const upsertConfig = internalMutation({
  args: {
    userId: v.id("users"),
    byokEnabled: v.optional(v.boolean()),
    encryptedVercelGatewayKey: v.optional(v.string()),
    encryptedOpenRouterKey: v.optional(v.string()),
    encryptedGroqKey: v.optional(v.string()),
    encryptedDeepgramKey: v.optional(v.string()),
    encryptionIVs: v.optional(v.string()),
    authTags: v.optional(v.string()),
    lastValidated: v.optional(
      v.object({
        vercelGateway: v.optional(v.number()),
        openRouter: v.optional(v.number()),
        groq: v.optional(v.number()),
        deepgram: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<Id<"userApiKeys">> => {
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing - merge fields
      const updates: Record<string, unknown> = { updatedAt: now };

      if (args.byokEnabled !== undefined)
        updates.byokEnabled = args.byokEnabled;
      if (args.encryptedVercelGatewayKey !== undefined)
        updates.encryptedVercelGatewayKey = args.encryptedVercelGatewayKey;
      if (args.encryptedOpenRouterKey !== undefined)
        updates.encryptedOpenRouterKey = args.encryptedOpenRouterKey;
      if (args.encryptedGroqKey !== undefined)
        updates.encryptedGroqKey = args.encryptedGroqKey;
      if (args.encryptedDeepgramKey !== undefined)
        updates.encryptedDeepgramKey = args.encryptedDeepgramKey;
      if (args.encryptionIVs !== undefined)
        updates.encryptionIVs = args.encryptionIVs;
      if (args.authTags !== undefined) updates.authTags = args.authTags;
      if (args.lastValidated !== undefined) {
        // Merge lastValidated timestamps
        updates.lastValidated = {
          ...existing.lastValidated,
          ...args.lastValidated,
        };
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("userApiKeys", {
      userId: args.userId,
      byokEnabled: args.byokEnabled ?? false,
      encryptedVercelGatewayKey: args.encryptedVercelGatewayKey,
      encryptedOpenRouterKey: args.encryptedOpenRouterKey,
      encryptedGroqKey: args.encryptedGroqKey,
      encryptedDeepgramKey: args.encryptedDeepgramKey,
      encryptionIVs: args.encryptionIVs,
      authTags: args.authTags,
      lastValidated: args.lastValidated,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Delete config completely
 */
export const deleteConfig = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<void> => {
    const config = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (config) {
      await ctx.db.delete(config._id);
    }
  },
});
