import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/userSync";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new feedback (any authenticated user)
 */
export const createFeedback = mutation({
  args: {
    feedbackType: v.union(
      v.literal("bug"),
      v.literal("feature"),
      v.literal("praise"),
      v.literal("other"),
    ),
    description: v.string(),
    page: v.string(),
    whatTheyDid: v.optional(v.string()),
    whatTheySaw: v.optional(v.string()),
    whatTheyExpected: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const feedbackId = await ctx.db.insert("feedback", {
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      page: args.page,
      feedbackType: args.feedbackType,
      description: args.description,
      whatTheyDid: args.whatTheyDid,
      whatTheySaw: args.whatTheySaw,
      whatTheyExpected: args.whatTheyExpected,
      screenshotStorageId: args.screenshotStorageId,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    return feedbackId;
  },
});

/**
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.union(
      v.literal("new"),
      v.literal("in-progress"),
      v.literal("resolved"),
      v.literal("wont-fix"),
    ),
  },
  handler: async (ctx, { feedbackId, status }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(feedbackId, {
      status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all feedback (admin only)
 */
export const listFeedback = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("in-progress"),
        v.literal("resolved"),
        v.literal("wont-fix"),
      ),
    ),
  },
  handler: async (ctx, { status }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    if (status) {
      return await ctx.db
        .query("feedback")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("feedback").order("desc").collect();
  },
});

/**
 * Get single feedback by ID (admin only)
 */
export const getFeedback = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, { feedbackId }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback) {
      return null;
    }

    // Get screenshot URL if exists
    let screenshotUrl: string | null = null;
    if (feedback.screenshotStorageId) {
      screenshotUrl = await ctx.storage.getUrl(feedback.screenshotStorageId);
    }

    return {
      ...feedback,
      screenshotUrl,
    };
  },
});

/**
 * Get feedback counts by status (admin only)
 */
export const getFeedbackCounts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const allFeedback = await ctx.db.query("feedback").collect();

    const counts = {
      new: 0,
      "in-progress": 0,
      resolved: 0,
      "wont-fix": 0,
      total: allFeedback.length,
    };

    for (const feedback of allFeedback) {
      counts[feedback.status]++;
    }

    return counts;
  },
});
