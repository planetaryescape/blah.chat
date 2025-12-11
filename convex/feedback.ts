import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// Re-export triage module
export * as triage from "./feedback/triage";

// ============================================================================
// STATUS CONFIGURATIONS BY TYPE
// ============================================================================

// Status values valid for each feedback type
export const STATUS_BY_TYPE = {
  bug: [
    "new",
    "triaging",
    "in-progress",
    "resolved",
    "verified",
    "closed",
    "wont-fix",
    "duplicate",
    "cannot-reproduce",
  ],
  feature: [
    "submitted",
    "under-review",
    "planned",
    "in-progress",
    "shipped",
    "declined",
    "maybe-later",
  ],
  praise: ["received", "acknowledged", "shared"],
  other: ["new", "reviewed", "actioned", "closed"],
} as const;

// Default status for each feedback type
export const DEFAULT_STATUS_BY_TYPE = {
  bug: "new",
  feature: "submitted",
  praise: "received",
  other: "new",
} as const;

// All possible status values for schema validation
const statusValidator = v.union(
  // Bug statuses
  v.literal("new"),
  v.literal("triaging"),
  v.literal("in-progress"),
  v.literal("resolved"),
  v.literal("verified"),
  v.literal("closed"),
  v.literal("wont-fix"),
  v.literal("duplicate"),
  v.literal("cannot-reproduce"),
  // Feature statuses
  v.literal("submitted"),
  v.literal("under-review"),
  v.literal("planned"),
  v.literal("shipped"),
  v.literal("declined"),
  v.literal("maybe-later"),
  // Praise statuses
  v.literal("received"),
  v.literal("acknowledged"),
  v.literal("shared"),
  // General statuses
  v.literal("reviewed"),
  v.literal("actioned"),
);

const feedbackTypeValidator = v.union(
  v.literal("bug"),
  v.literal("feature"),
  v.literal("praise"),
  v.literal("other"),
);

const priorityValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("none"),
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new feedback (any authenticated user)
 */
export const createFeedback = mutation({
  args: {
    feedbackType: feedbackTypeValidator,
    description: v.string(),
    page: v.string(),
    whatTheyDid: v.optional(v.string()),
    whatTheySaw: v.optional(v.string()),
    whatTheyExpected: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),
    userSuggestedUrgency: v.optional(
      v.union(v.literal("urgent"), v.literal("normal"), v.literal("low")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const defaultStatus = DEFAULT_STATUS_BY_TYPE[args.feedbackType];

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
      userSuggestedUrgency: args.userSuggestedUrgency,
      status: defaultStatus,
      priority: "none",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule AI auto-triage (runs asynchronously)
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.feedback.triage.autoTriageFeedback,
      {
        feedbackId,
      },
    );

    return feedbackId;
  },
});

/**
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: statusValidator,
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

/**
 * Update feedback priority (admin only)
 */
export const updateFeedbackPriority = mutation({
  args: {
    feedbackId: v.id("feedback"),
    priority: priorityValidator,
  },
  handler: async (ctx, { feedbackId, priority }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(feedbackId, {
      priority,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update feedback tags (admin only)
 */
export const updateFeedbackTags = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { feedbackId, tags }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Update tag usage counts
    for (const tag of tags) {
      const existingTag = await ctx.db
        .query("feedbackTags")
        .withIndex("by_name", (q) => q.eq("name", tag))
        .first();

      if (existingTag) {
        await ctx.db.patch(existingTag._id, {
          usageCount: existingTag.usageCount + 1,
        });
      } else {
        await ctx.db.insert("feedbackTags", {
          name: tag,
          usageCount: 1,
          createdAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(feedbackId, {
      tags,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Bulk update status (admin only)
 */
export const bulkUpdateStatus = mutation({
  args: {
    feedbackIds: v.array(v.id("feedback")),
    status: statusValidator,
  },
  handler: async (ctx, { feedbackIds, status }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();
    for (const feedbackId of feedbackIds) {
      await ctx.db.patch(feedbackId, {
        status,
        updatedAt: now,
      });
    }

    return { success: true, count: feedbackIds.length };
  },
});

/**
 * Archive feedback (admin only)
 */
export const archiveFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, { feedbackId }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(feedbackId, {
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Internal query to get feedback by ID (for actions)
 */
export const getFeedbackInternal = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, { feedbackId }) => {
    return await ctx.db.get(feedbackId);
  },
});

/**
 * List all feedback with filters (admin only)
 */
export const listFeedback = query({
  args: {
    status: v.optional(statusValidator),
    feedbackType: v.optional(feedbackTypeValidator),
    priority: v.optional(priorityValidator),
    searchQuery: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
    sortBy: v.optional(
      v.union(
        v.literal("createdAt"),
        v.literal("updatedAt"),
        v.literal("priority"),
      ),
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    let results = await ctx.db.query("feedback").order("desc").collect();

    // Filter by status
    if (args.status) {
      results = results.filter((f) => f.status === args.status);
    }

    // Filter by type
    if (args.feedbackType) {
      results = results.filter((f) => f.feedbackType === args.feedbackType);
    }

    // Filter by priority
    if (args.priority) {
      results = results.filter((f) => f.priority === args.priority);
    }

    // Exclude archived unless requested
    if (!args.includeArchived) {
      results = results.filter((f) => !f.archivedAt);
    }

    // Text search on description, userName, userEmail
    if (args.searchQuery?.trim()) {
      const query = args.searchQuery.toLowerCase().trim();
      results = results.filter(
        (f) =>
          f.description.toLowerCase().includes(query) ||
          f.userName.toLowerCase().includes(query) ||
          f.userEmail.toLowerCase().includes(query) ||
          f.page.toLowerCase().includes(query),
      );
    }

    // Sort by priority (custom order)
    if (args.sortBy === "priority") {
      const priorityOrder = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        none: 4,
      };
      results.sort((a, b) => {
        const aPriority = priorityOrder[a.priority || "none"];
        const bPriority = priorityOrder[b.priority || "none"];
        return args.sortOrder === "asc"
          ? aPriority - bPriority
          : bPriority - aPriority;
      });
    }

    return results;
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
 * Get feedback counts by status and type (admin only)
 */
export const getFeedbackCounts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const allFeedback = await ctx.db.query("feedback").collect();
    const activeFeedback = allFeedback.filter((f) => !f.archivedAt);

    const counts: Record<string, number> = {
      total: activeFeedback.length,
      archived: allFeedback.length - activeFeedback.length,
    };

    // Count by status
    for (const feedback of activeFeedback) {
      counts[feedback.status] = (counts[feedback.status] || 0) + 1;
    }

    // Count by type
    for (const feedback of activeFeedback) {
      const typeKey = `type_${feedback.feedbackType}`;
      counts[typeKey] = (counts[typeKey] || 0) + 1;
    }

    // Count by priority
    for (const feedback of activeFeedback) {
      const priorityKey = `priority_${feedback.priority || "none"}`;
      counts[priorityKey] = (counts[priorityKey] || 0) + 1;
    }

    return counts;
  },
});

/**
 * Get tag suggestions for autocomplete (admin only)
 */
export const getTagSuggestions = query({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 20 }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    let tags = await ctx.db.query("feedbackTags").order("desc").collect();

    // Filter by query if provided
    if (query?.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      tags = tags.filter((t) => t.name.toLowerCase().includes(lowerQuery));
    }

    // Sort by usage count
    tags.sort((a, b) => b.usageCount - a.usageCount);

    return tags.slice(0, limit);
  },
});

/**
 * Get valid statuses for a feedback type (for UI dropdowns)
 */
export const getStatusesForType = query({
  args: {
    feedbackType: feedbackTypeValidator,
  },
  handler: async (_, { feedbackType }) => {
    return STATUS_BY_TYPE[feedbackType];
  },
});

// ============================================================================
// TAG OPERATIONS (DUAL-WRITE: Phase 5)
// ============================================================================

/**
 * Add a tag to feedback (DUAL-WRITE: Phase 5)
 */
export const addTag = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tag: v.string(),
  },
  handler: async (ctx, { feedbackId, tag }) => {
    const user = await getCurrentUserOrCreate(ctx);
    const feedback = await ctx.db.get(feedbackId);

    if (!feedback || feedback.userId !== user._id) {
      throw new Error("Feedback not found");
    }

    const currentTags = feedback.tags || [];
    const cleanTag = tag.trim().toLowerCase();

    // Skip if duplicate
    if (currentTags.includes(cleanTag)) return;

    // NEW SYSTEM: Get or create tag
    const { normalizeTagSlug } = await import("../src/lib/utils/tagUtils");
    const slug = normalizeTagSlug(tag);

    let centralTag = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", slug),
      )
      .unique();

    if (!centralTag) {
      const now = Date.now();
      const tagId = await ctx.db.insert("tags", {
        slug,
        displayName: tag,
        userId: user._id,
        scope: "user",
        parentId: undefined,
        path: `/${slug}`,
        depth: 0,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      centralTag = (await ctx.db.get(tagId))!;
    }

    // Create junction entry
    const existingJunction = await ctx.db
      .query("feedbackTagJunctions")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", feedbackId).eq("tagId", centralTag._id),
      )
      .unique();

    if (!existingJunction) {
      await ctx.db.insert("feedbackTagJunctions", {
        feedbackId,
        tagId: centralTag._id,
        userId: user._id,
        createdAt: Date.now(),
      });

      await ctx.db.patch(centralTag._id, {
        usageCount: centralTag.usageCount + 1,
        updatedAt: Date.now(),
      });
    }

    // OLD SYSTEM: Write to array
    await ctx.db.patch(feedbackId, {
      tags: [...currentTags, cleanTag],
    });
  },
});

/**
 * Remove a tag from feedback (DUAL-WRITE: Phase 5)
 */
export const removeTag = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tag: v.string(),
  },
  handler: async (ctx, { feedbackId, tag }) => {
    const user = await getCurrentUserOrCreate(ctx);
    const feedback = await ctx.db.get(feedbackId);

    if (!feedback || feedback.userId !== user._id) {
      throw new Error("Feedback not found");
    }

    // NEW SYSTEM: Find and delete junction entry
    const { normalizeTagSlug } = await import("../src/lib/utils/tagUtils");
    const slug = normalizeTagSlug(tag);

    const centralTag = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", slug),
      )
      .unique();

    if (centralTag) {
      const junction = await ctx.db
        .query("feedbackTagJunctions")
        // @ts-ignore - Type depth exceeded
        .withIndex("by_feedback_tag", (q) =>
          q.eq("feedbackId", feedbackId).eq("tagId", centralTag._id),
        )
        .unique();

      if (junction) {
        await ctx.db.delete(junction._id);

        await ctx.db.patch(centralTag._id, {
          usageCount: Math.max(0, centralTag.usageCount - 1),
          updatedAt: Date.now(),
        });
      }
    }

    // OLD SYSTEM: Remove from array
    await ctx.db.patch(feedbackId, {
      tags: (feedback.tags || []).filter((t) => t !== tag),
    });
  },
});
