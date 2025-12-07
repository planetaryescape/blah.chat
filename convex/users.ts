import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

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
      preferences: {
        theme: "dark",
        defaultModel: "gpt-4o",
        sendOnEnter: true,
        enableHybridSearch: false,
        autoMemoryExtractEnabled: true,
        autoMemoryExtractInterval: 5,
        budgetHardLimitEnabled: true,
      },
      dailyMessageLimit: 50,
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
      sendOnEnter: v.optional(v.boolean()),
      codeTheme: v.optional(v.string()),
      fontSize: v.optional(v.string()),
      enableHybridSearch: v.optional(v.boolean()),
      autoMemoryExtractEnabled: v.optional(v.boolean()),
      autoMemoryExtractInterval: v.optional(v.number()),
      budgetHardLimitEnabled: v.optional(v.boolean()),
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
      reasoning: v.optional(
        v.object({
          showByDefault: v.optional(v.boolean()),
          autoExpand: v.optional(v.boolean()),
          showDuringStreaming: v.optional(v.boolean()),
        }),
      ),
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

    await ctx.db.patch(user._id, {
      preferences: {
        ...user.preferences,
        ...args.preferences,
      },
      updatedAt: Date.now(),
    });
  },
});

export const updateCustomInstructions = mutation({
  args: {
    aboutUser: v.string(),
    responseStyle: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Validate length (3000 chars max each)
    if (args.aboutUser.length > 3000 || args.responseStyle.length > 3000) {
      throw new Error("Max 3000 characters per field");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      preferences: {
        ...user.preferences,
        customInstructions: {
          aboutUser: args.aboutUser,
          responseStyle: args.responseStyle,
          enabled: args.enabled,
        },
      },
      updatedAt: Date.now(),
    });
  },
});

export const updateBudgetSettings = mutation({
  args: {
    monthlyBudget: v.optional(v.number()),
    budgetAlertThreshold: v.optional(v.number()),
    budgetHardLimitEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const updates: any = { updatedAt: Date.now() };

    if (args.monthlyBudget !== undefined) {
      updates.monthlyBudget = args.monthlyBudget;
    }
    if (args.budgetAlertThreshold !== undefined) {
      updates.budgetAlertThreshold = args.budgetAlertThreshold;
    }
    if (args.budgetHardLimitEnabled !== undefined) {
      updates.preferences = {
        ...user.preferences,
        budgetHardLimitEnabled: args.budgetHardLimitEnabled,
      };
    }

    await ctx.db.patch(user._id, updates);
  },
});

export const updateDailyMessageLimit = mutation({
  args: {
    dailyMessageLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    if (args.dailyMessageLimit < 1 || args.dailyMessageLimit > 1000) {
      throw new Error("Daily message limit must be between 1 and 1000");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      dailyMessageLimit: args.dailyMessageLimit,
      updatedAt: Date.now(),
    });
  },
});
