import { v } from "convex/values";
import { normalizeTagSlug } from "../../src/lib/utils/tagUtils";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";

/**
 * Helper: Get current user from auth context (query version)
 */
async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user;
}

/**
 * Helper: Get current user from auth context (mutation version)
 */
async function getCurrentUserOrCreate(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) throw new Error("User not found");
  return user;
}

/**
 * Phase 5: Admin-only tag operations
 * For managing global feedback tags
 */

/**
 * Get all global tags (admin only)
 */
export const getGlobalTags = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user?.isAdmin) throw new Error("Unauthorized");

    return (
      ctx.db
        .query("tags")
        // @ts-ignore - Type depth exceeded with complex Convex query
        .withIndex("by_scope", (q) => q.eq("scope", "global"))
        .collect()
    );
  },
});

/**
 * Create global tag (admin only)
 */
export const createGlobalTag = mutation({
  args: {
    displayName: v.string(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (!user.isAdmin) throw new Error("Unauthorized");

    const slug = normalizeTagSlug(args.displayName);

    // Check if global tag already exists
    const existing = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded with complex Convex query
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .filter((q) => q.eq(q.field("slug"), slug))
      .unique();

    if (existing) {
      throw new Error("Global tag with this slug already exists");
    }

    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      slug,
      displayName: args.displayName,
      userId: undefined, // Global tags have no user
      scope: "global",
      parentId: undefined,
      path: `/${slug}`,
      depth: 0,
      usageCount: 0,
      color: args.color,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(tagId);
  },
});

/**
 * Update global tag (admin only)
 */
export const updateGlobalTag = mutation({
  args: {
    tagId: v.id("tags"),
    displayName: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (!user.isAdmin) throw new Error("Unauthorized");

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.scope !== "global") {
      throw new Error("Can only modify global tags");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.displayName) {
      const newSlug = normalizeTagSlug(args.displayName);
      updates.slug = newSlug;
      updates.displayName = args.displayName;
      updates.path = `/${newSlug}`;
    }

    if (args.color !== undefined) updates.color = args.color;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.tagId, updates);
    return await ctx.db.get(args.tagId);
  },
});

/**
 * Delete global tag (admin only)
 */
export const deleteGlobalTag = mutation({
  args: {
    tagId: v.id("tags"),
    cascade: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (!user.isAdmin) throw new Error("Unauthorized");

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.scope !== "global") {
      throw new Error("Can only delete global tags");
    }

    // Check for references
    const feedbackRefs = await ctx.db
      .query("feedbackTagJunctions")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .first();

    if (feedbackRefs && !args.cascade) {
      throw new Error(
        "Tag is in use. Set cascade=true to delete all references.",
      );
    }

    // Cascade delete if requested
    if (args.cascade) {
      const refs = await ctx.db
        .query("feedbackTagJunctions")
        .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
        .collect();

      for (const ref of refs) {
        await ctx.db.delete(ref._id);
      }
    }

    await ctx.db.delete(args.tagId);
    return { success: true };
  },
});

/**
 * Get global tag usage stats (admin only)
 */
export const getGlobalTagStats = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user?.isAdmin) throw new Error("Unauthorized");

    const globalTags = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded with complex Convex query
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .collect();

    return globalTags.map((tag) => ({
      _id: tag._id,
      slug: tag.slug,
      displayName: tag.displayName,
      usageCount: tag.usageCount,
      color: tag.color,
      description: tag.description,
    }));
  },
});
