import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// ===== Validators =====

export const slideTypeValidator = v.union(
  v.literal("title"),
  v.literal("section"),
  v.literal("content"),
);

// ===== Queries =====

/**
 * List outline items for a presentation (latest version)
 */
export const listByPresentation = query({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      return [];
    }

    // Get current version (default to 1 if not set)
    const currentVersion = presentation.currentOutlineVersion ?? 1;

    // Query items for this version, ordered by position
    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q
          .eq("presentationId", args.presentationId)
          .eq("version", currentVersion),
      )
      .collect();

    return items.sort((a, b) => a.position - b.position);
  },
});

/**
 * Get outline items count for a presentation
 */
export const getCount = query({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      return 0;
    }

    const currentVersion = presentation.currentOutlineVersion ?? 1;

    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q
          .eq("presentationId", args.presentationId)
          .eq("version", currentVersion),
      )
      .collect();

    return items.length;
  },
});

// ===== Internal Queries =====

export const listByPresentationInternal = internalQuery({
  args: {
    presentationId: v.id("presentations"),
    version: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) return [];

    const version = args.version ?? presentation.currentOutlineVersion ?? 1;

    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q.eq("presentationId", args.presentationId).eq("version", version),
      )
      .collect();

    return items.sort((a, b) => a.position - b.position);
  },
});

// ===== Mutations =====

/**
 * Update feedback for a specific outline item
 */
export const updateFeedback = mutation({
  args: {
    outlineItemId: v.id("outlineItems"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const item = await ctx.db.get(args.outlineItemId);

    if (!item || item.userId !== user._id) {
      throw new Error("Outline item not found");
    }

    await ctx.db.patch(args.outlineItemId, {
      feedback: args.feedback || undefined, // Clear if empty
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update positions after drag-drop reorder
 */
export const updatePositions = mutation({
  args: {
    presentationId: v.id("presentations"),
    positions: v.array(
      v.object({
        itemId: v.id("outlineItems"),
        position: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Update each item's position
    for (const { itemId, position } of args.positions) {
      const item = await ctx.db.get(itemId);
      if (item && item.userId === user._id) {
        await ctx.db.patch(itemId, {
          position,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// ===== Internal Mutations =====

/**
 * Create outline items from parsed outline (internal, called during generation)
 */
export const createBatch = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    userId: v.id("users"),
    version: v.number(),
    items: v.array(
      v.object({
        position: v.number(),
        slideType: slideTypeValidator,
        title: v.string(),
        content: v.string(),
        speakerNotes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const item of args.items) {
      await ctx.db.insert("outlineItems", {
        presentationId: args.presentationId,
        userId: args.userId,
        position: item.position,
        slideType: item.slideType,
        title: item.title,
        content: item.content,
        speakerNotes: item.speakerNotes,
        version: args.version,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update presentation's current version
    await ctx.db.patch(args.presentationId, {
      currentOutlineVersion: args.version,
      outlineStatus: "ready",
      updatedAt: now,
    });
  },
});

/**
 * Delete all outline items for a presentation (specific version or all)
 */
export const deleteByPresentation = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    version: v.optional(v.number()), // If not provided, delete all
  },
  handler: async (ctx, args) => {
    let items;

    if (args.version !== undefined) {
      const version = args.version;
      items = await ctx.db
        .query("outlineItems")
        .withIndex("by_presentation_version", (q) =>
          q.eq("presentationId", args.presentationId).eq("version", version),
        )
        .collect();
    } else {
      items = await ctx.db
        .query("outlineItems")
        .withIndex("by_presentation", (q) =>
          q.eq("presentationId", args.presentationId),
        )
        .collect();
    }

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});

/**
 * Clear all feedback from outline items (used after regeneration)
 */
export const clearFeedback = internalMutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) return;

    const currentVersion = presentation.currentOutlineVersion ?? 1;

    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q
          .eq("presentationId", args.presentationId)
          .eq("version", currentVersion),
      )
      .collect();

    for (const item of items) {
      if (item.feedback) {
        await ctx.db.patch(item._id, {
          feedback: undefined,
          updatedAt: Date.now(),
        });
      }
    }
  },
});
