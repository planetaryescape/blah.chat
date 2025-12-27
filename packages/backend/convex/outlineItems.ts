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
  // Presentation types (16:9)
  v.literal("title"),
  v.literal("section"),
  v.literal("content"),
  // Carousel/Story types (1:1, 9:16)
  v.literal("hook"),
  v.literal("rehook"),
  v.literal("value"),
  v.literal("cta"),
  // Narrative beat types (emotional arc)
  v.literal("context"),
  v.literal("validation"),
  v.literal("reality"),
  v.literal("emotional"),
  v.literal("reframe"),
  v.literal("affirmation"),
);

// ===== Queries =====

/**
 * List outline items for a presentation (latest version)
 */
/**
 * List outline items for a presentation (latest version)
 */
export const list = query({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    // Reuse implementation or just rename the function
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

export const listByPresentation = list; // Helper alias if needed elsewhere

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
 * Update content fields for a specific outline item
 */
export const updateContent = mutation({
  args: {
    outlineItemId: v.id("outlineItems"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    speakerNotes: v.optional(v.string()),
    visualDirection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const item = await ctx.db.get(args.outlineItemId);

    if (!item || item.userId !== user._id) {
      throw new Error("Outline item not found");
    }

    // Build patch object with only provided fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;
    if (args.speakerNotes !== undefined)
      patch.speakerNotes = args.speakerNotes || undefined;
    if (args.visualDirection !== undefined)
      patch.visualDirection = args.visualDirection || undefined;

    await ctx.db.patch(args.outlineItemId, patch);
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
        visualDirection: v.optional(v.string()),
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
        visualDirection: item.visualDirection,
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
 * Upsert outline items during streaming (insert new, update existing by position)
 * Used during incremental outline parsing - items have status "partial"
 */
export const upsertBatch = internalMutation({
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
        visualDirection: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing items for this version
    const existingItems = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q.eq("presentationId", args.presentationId).eq("version", args.version),
      )
      .collect();

    // Create a map by position for quick lookup
    const existingByPosition = new Map(
      existingItems.map((item) => [item.position, item]),
    );

    for (const item of args.items) {
      const existing = existingByPosition.get(item.position);

      if (existing) {
        // Update existing item if content changed
        const hasChanged =
          existing.title !== item.title ||
          existing.content !== item.content ||
          existing.slideType !== item.slideType ||
          existing.speakerNotes !== item.speakerNotes ||
          existing.visualDirection !== item.visualDirection;

        if (hasChanged) {
          await ctx.db.patch(existing._id, {
            title: item.title,
            content: item.content,
            slideType: item.slideType,
            speakerNotes: item.speakerNotes,
            visualDirection: item.visualDirection,
            status: "partial",
            updatedAt: now,
          });
        }
      } else {
        // Insert new item with partial status
        await ctx.db.insert("outlineItems", {
          presentationId: args.presentationId,
          userId: args.userId,
          position: item.position,
          slideType: item.slideType,
          title: item.title,
          content: item.content,
          speakerNotes: item.speakerNotes,
          visualDirection: item.visualDirection,
          version: args.version,
          status: "partial",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Mark all outline items as complete (called when generation finishes)
 */
export const markComplete = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    version: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) return;

    const version = args.version ?? presentation.currentOutlineVersion ?? 1;
    const now = Date.now();

    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q.eq("presentationId", args.presentationId).eq("version", version),
      )
      .collect();

    for (const item of items) {
      if (item.status !== "complete") {
        await ctx.db.patch(item._id, {
          status: "complete",
          updatedAt: now,
        });
      }
    }
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

/**
 * Update visual directions for multiple outline items (batch update)
 * Called after design system generation to set AI-generated visual directions
 */
export const updateVisualDirections = internalMutation({
  args: {
    items: v.array(
      v.object({
        itemId: v.id("outlineItems"),
        visualDirection: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const { itemId, visualDirection } of args.items) {
      await ctx.db.patch(itemId, {
        visualDirection,
        updatedAt: now,
      });
    }
  },
});
