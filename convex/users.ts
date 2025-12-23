import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAllUserPreferences as getAllUserPreferencesHelper,
  getUserPreference as getUserPreferenceHelper,
  getUserPreferencesByCategory as getUserPreferencesByCategoryHelper,
  updateUserPreference as updateUserPreferenceHelper,
} from "./users/preferences";

// NOTE: This must match the DEFAULT_MODEL_ID in src/lib/ai/operational-models.ts
const _DEFAULT_MODEL_FOR_NEW_USERS = "openai:gpt-oss-120b";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      dailyMessageCount: 0,
      lastMessageDate: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const updateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      ...(args.email && { email: args.email }),
      ...(args.name && { name: args.name }),
      ...(args.imageUrl !== undefined && { imageUrl: args.imageUrl }),
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

export const deleteUser = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.delete(user._id);
    return user._id;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

export const updatePreferences = mutation({
  args: {
    preferences: v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
      defaultModel: v.optional(v.string()),
      favoriteModels: v.optional(v.array(v.string())),
      recentModels: v.optional(v.array(v.string())),
      newChatModelSelection: v.optional(
        v.union(v.literal("fixed"), v.literal("recent")),
      ),
      sendOnEnter: v.optional(v.boolean()),
      codeTheme: v.optional(v.string()),
      fontSize: v.optional(v.string()),
      alwaysShowMessageActions: v.optional(v.boolean()),
      sttEnabled: v.optional(v.boolean()),
      sttProvider: v.optional(
        v.union(
          v.literal("openai"),
          v.literal("deepgram"),
          v.literal("assemblyai"),
          v.literal("groq"),
        ),
      ),
      ttsEnabled: v.optional(v.boolean()),
      ttsProvider: v.optional(v.string()),
      ttsVoice: v.optional(v.string()),
      ttsSpeed: v.optional(v.number()),
      ttsAutoRead: v.optional(v.boolean()),
      reasoning: v.optional(
        v.object({
          showByDefault: v.optional(v.boolean()),
          autoExpand: v.optional(v.boolean()),
          showDuringStreaming: v.optional(v.boolean()),
        }),
      ),
      showModelNamesDuringComparison: v.optional(v.boolean()),
      chatWidth: v.optional(
        v.union(
          v.literal("narrow"),
          v.literal("standard"),
          v.literal("wide"),
          v.literal("full"),
        ),
      ),
      showMessageStatistics: v.optional(v.boolean()),
      showComparisonStatistics: v.optional(v.boolean()),
      showModelProvider: v.optional(v.boolean()),
      showNotes: v.optional(v.boolean()),
      showTemplates: v.optional(v.boolean()),
      showProjects: v.optional(v.boolean()),
      showBookmarks: v.optional(v.boolean()),
      showSlides: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Phase 4: Update each changed preference
    for (const [key, value] of Object.entries(args.preferences)) {
      if (value !== undefined) {
        await updateUserPreferenceHelper(ctx, user._id, key, value);
      }
    }
  },
});

export const updateCustomInstructions = mutation({
  args: {
    aboutUser: v.string(),
    responseStyle: v.string(),
    enabled: v.boolean(),
    // New personalization fields
    baseStyleAndTone: v.optional(
      v.union(
        v.literal("default"),
        v.literal("professional"),
        v.literal("friendly"),
        v.literal("candid"),
        v.literal("quirky"),
        v.literal("efficient"),
        v.literal("nerdy"),
        v.literal("cynical"),
      ),
    ),
    nickname: v.optional(v.string()),
    occupation: v.optional(v.string()),
    moreAboutYou: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Validate length limits
    if (args.aboutUser.length > 3000 || args.responseStyle.length > 3000) {
      throw new Error("Max 3000 characters per field");
    }
    if (args.nickname && args.nickname.length > 100) {
      throw new Error("Nickname must be 100 characters or less");
    }
    if (args.occupation && args.occupation.length > 200) {
      throw new Error("Occupation must be 200 characters or less");
    }
    if (args.moreAboutYou && args.moreAboutYou.length > 3000) {
      throw new Error("More about you must be 3000 characters or less");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Phase 4: Get existing customInstructions to preserve unmodified fields (forward compat)
    const existing =
      (await getUserPreferenceHelper(ctx, user._id, "customInstructions")) ||
      {};

    // Merge new values with existing to preserve any future fields
    const updated = {
      ...existing,
      aboutUser: args.aboutUser,
      responseStyle: args.responseStyle,
      enabled: args.enabled,
      baseStyleAndTone: args.baseStyleAndTone,
      nickname: args.nickname,
      occupation: args.occupation,
      moreAboutYou: args.moreAboutYou,
    };

    // Phase 4: Write to preferences table
    await updateUserPreferenceHelper(
      ctx,
      user._id,
      "customInstructions",
      updated,
    );
  },
});

// Budget and limits are now controlled globally via admin settings
// These mutations are deprecated and kept only for backward compatibility
// Calling them will have no effect

export const setDefaultModel = mutation({
  args: {
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Phase 4: Write to preferences table
    await updateUserPreferenceHelper(
      ctx,
      user._id,
      "defaultModel",
      args.modelId,
    );
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    // Only for migration - can be removed after backfill
    return await ctx.db.query("users").collect();
  },
});

/**
 * Phase 4: New preference queries using flat key-value table
 */

/**
 * Get single user preference by key
 */
export const getUserPreference = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await getUserPreferenceHelper(ctx, user._id, key as any);
  },
});

/**
 * Get all user preferences in a category
 */
export const getUserPreferencesByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await getUserPreferencesByCategoryHelper(ctx, user._id, category);
  },
});

/**
 * Get all user preferences (flattened)
 */
export const getAllUserPreferences = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await getAllUserPreferencesHelper(ctx, user._id);
  },
});
