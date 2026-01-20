import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { cascadeDeleteUserData } from "./lib/utils/cascade";
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
      minimalAssistantStyle: v.optional(v.boolean()),
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
      showTasks: v.optional(v.boolean()),
      showSmartAssistant: v.optional(v.boolean()),
      noteCategoryMode: v.optional(
        v.union(v.literal("fixed"), v.literal("ai-suggested")),
      ),
      customNoteCategories: v.optional(v.array(v.string())),
      autoCompressContext: v.optional(v.boolean()),
      autoRouterCostBias: v.optional(v.number()),
      autoRouterSpeedBias: v.optional(v.number()),
      memoryExtractionLevel: v.optional(
        v.union(
          v.literal("none"),
          v.literal("passive"),
          v.literal("minimal"),
          v.literal("moderate"),
          v.literal("active"),
        ),
      ),
      // Accessibility
      highContrastMode: v.optional(v.boolean()),
      textScale: v.optional(v.number()),
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

    // Rebuild cached system prompts for all recent conversations (background, non-blocking)
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.prompts.cache.rebuildUserPrompts,
      { userId: user._id },
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

/**
 * Get single user preference by userId (for internal use)
 * Used by actions that already have userId (e.g., memory extraction)
 */
export const getUserPreferenceByUserId = query({
  args: { userId: v.id("users"), key: v.string() },
  handler: async (ctx, { userId, key }) => {
    return await getUserPreferenceHelper(ctx, userId, key as any);
  },
});

// ========================================
// GDPR: Data Export & Deletion
// ========================================

/**
 * Internal query to get all user data for export
 */
export const _getAllUserDataForExport = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const [
      user,
      conversations,
      messages,
      memories,
      notes,
      tasks,
      projects,
      bookmarks,
      snippets,
      files,
      preferences,
    ] = await Promise.all([
      ctx.db.get(userId),
      ctx.db
        .query("conversations")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("memories")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("notes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("snippets")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    return {
      user: user
        ? { email: user.email, name: user.name, createdAt: user.createdAt }
        : null,
      conversations: conversations.map((c) => ({
        id: c._id,
        title: c.title,
        model: c.model,
        createdAt: c._creationTime,
      })),
      messages: messages.map((m) => ({
        id: m._id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        model: m.model,
        createdAt: m._creationTime,
      })),
      memories: memories.map((m) => ({
        id: m._id,
        content: m.content,
        category: m.metadata.category,
        createdAt: m._creationTime,
      })),
      notes: notes.map((n) => ({
        id: n._id,
        title: n.title,
        content: n.content,
        createdAt: n._creationTime,
      })),
      tasks: tasks.map((t) => ({
        id: t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        createdAt: t._creationTime,
      })),
      projects: projects.map((p) => ({
        id: p._id,
        name: p.name,
        description: p.description,
        createdAt: p._creationTime,
      })),
      bookmarks: bookmarks.map((b) => ({
        id: b._id,
        messageId: b.messageId,
        note: b.note,
        createdAt: b._creationTime,
      })),
      snippets: snippets.map((s) => ({
        id: s._id,
        text: s.text,
        note: s.note,
        tags: s.tags,
        createdAt: s._creationTime,
      })),
      files: files.map((f) => ({
        id: f._id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        createdAt: f._creationTime,
      })),
      preferences: preferences.reduce(
        (acc, p) => {
          acc[p.key] = p.value;
          return acc;
        },
        {} as Record<string, unknown>,
      ),
    };
  },
});

/**
 * Export all user data as JSON (GDPR right to portability)
 */
export const exportMyData = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get user by clerk ID
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.users._getUserByClerkIdInternal,
      { clerkId: identity.subject },
    )) as { _id: string } | null;

    if (!user) throw new Error("User not found");

    // Get all user data
    const data = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.users._getAllUserDataForExport,
      { userId: user._id },
    )) as Record<string, unknown>;

    return {
      exportedAt: new Date().toISOString(),
      ...data,
    };
  },
});

/**
 * Internal query to get user by clerk ID
 */
export const _getUserByClerkIdInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

/**
 * Delete all user data but keep account (GDPR delete my data)
 */
export const deleteMyData = mutation({
  args: { confirmationText: v.string() },
  handler: async (ctx, { confirmationText }) => {
    if (confirmationText !== "DELETE MY DATA") {
      throw new Error('Please type "DELETE MY DATA" to confirm');
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await cascadeDeleteUserData(ctx, user._id);

    return { success: true };
  },
});

/**
 * Delete account and all data (GDPR delete my account)
 */
export const deleteMyAccount = mutation({
  args: { confirmationText: v.string() },
  handler: async (ctx, { confirmationText }) => {
    if (confirmationText !== "DELETE MY ACCOUNT") {
      throw new Error('Please type "DELETE MY ACCOUNT" to confirm');
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Delete all user data
    await cascadeDeleteUserData(ctx, user._id);

    // Delete user record
    await ctx.db.delete(user._id);

    // Schedule Clerk user deletion
    await ctx.scheduler.runAfter(0, internal.users._deleteClerkUser, {
      clerkId: user.clerkId,
    });

    return { success: true };
  },
});

/**
 * Internal action to delete user from Clerk
 */
export const _deleteClerkUser = internalAction({
  args: { clerkId: v.string() },
  handler: async (_ctx, { clerkId }) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not configured, skipping Clerk deletion");
      return;
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok && response.status !== 404) {
      console.error("Failed to delete Clerk user:", await response.text());
    }
  },
});
