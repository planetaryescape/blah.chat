import { v } from "convex/values";
import { normalizeTagSlug } from "../../src/lib/utils/tagUtils";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";

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
 * Phase 5: User-scoped tag mutations
 * Critical: ALWAYS verify ownership before modifications
 */

/**
 * Get or create a tag (user-scoped)
 * Returns existing tag if slug already exists for user
 */
export const getOrCreate = mutation({
  args: {
    displayName: v.string(),
    parentId: v.optional(v.id("tags")),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const slug = normalizeTagSlug(args.displayName);

    // Check for existing tag
    const tag = await ctx.db
      .query("tags")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", slug),
      )
      .unique();

    if (tag) return tag;

    // CRITICAL: Validate parent ownership if provided
    let parent = null;
    if (args.parentId) {
      parent = await ctx.db.get(args.parentId);
      if (!parent || parent.userId !== user._id) {
        throw new Error("Invalid parent: must belong to same user");
      }
    }

    // Create new tag
    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      slug,
      displayName: args.displayName,
      userId: user._id,
      scope: "user",
      parentId: args.parentId,
      path: parent ? `${parent.path}/${slug}` : `/${slug}`,
      depth: parent ? parent.depth + 1 : 0,
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
 * Rename a tag (user-scoped, auto-merges if collision)
 * Updates paths for all children recursively
 */
export const rename = mutation({
  args: {
    tagId: v.id("tags"),
    newDisplayName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const tag = await ctx.db.get(args.tagId);

    // CRITICAL: Ownership check
    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found"); // 404 for privacy
    }

    const newSlug = normalizeTagSlug(args.newDisplayName);

    // Check for collision (merge if exists)
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", newSlug),
      )
      .unique();

    if (existing && existing._id !== args.tagId) {
      // AUTO-MERGE: Move junction entries, delete source
      await mergeTagsInternal(ctx, args.tagId, existing._id);
      await ctx.db.delete(args.tagId);
      return existing;
    }

    // Update tag
    const parent = tag.parentId ? await ctx.db.get(tag.parentId) : null;
    await ctx.db.patch(args.tagId, {
      slug: newSlug,
      displayName: args.newDisplayName,
      path: parent ? `${parent.path}/${newSlug}` : `/${newSlug}`,
      updatedAt: Date.now(),
    });

    // Update children paths recursively
    await updateChildrenPaths(ctx, args.tagId);

    return await ctx.db.get(args.tagId);
  },
});

/**
 * Update tag metadata (color, description)
 */
export const updateMetadata = mutation({
  args: {
    tagId: v.id("tags"),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const tag = await ctx.db.get(args.tagId);

    // CRITICAL: Ownership check
    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found");
    }

    await ctx.db.patch(args.tagId, {
      color: args.color,
      description: args.description,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.tagId);
  },
});

/**
 * Delete a tag (with safety checks)
 * Options: prevent if in use, or cascade delete junctions
 */
export const deleteTag = mutation({
  args: {
    tagId: v.id("tags"),
    cascade: v.optional(v.boolean()), // If true, delete junction entries
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const tag = await ctx.db.get(args.tagId);

    // CRITICAL: Ownership check
    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found");
    }

    // Check for junction references
    const junctionTables = [
      "bookmarkTags",
      "snippetTags",
      "noteTags",
      "feedbackTagJunctions",
    ] as const;

    let hasReferences = false;
    for (const table of junctionTables) {
      const refs = await ctx.db
        .query(table)
        .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
        .first();
      if (refs) {
        hasReferences = true;
        break;
      }
    }

    if (hasReferences && !args.cascade) {
      throw new Error(
        "Tag is in use. Set cascade=true to delete all references.",
      );
    }

    // Cascade delete junctions if requested
    if (args.cascade) {
      for (const table of junctionTables) {
        const refs = await ctx.db
          .query(table)
          .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
          .collect();

        for (const ref of refs) {
          await ctx.db.delete(ref._id);
        }
      }
    }

    // Delete the tag
    await ctx.db.delete(args.tagId);
    return { success: true };
  },
});

/**
 * Merge two tags (move all junctions from source to target)
 * Used internally by rename, can also be called directly
 */
export const merge = mutation({
  args: {
    sourceId: v.id("tags"),
    targetId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Verify ownership of both tags
    const source = await ctx.db.get(args.sourceId);
    const target = await ctx.db.get(args.targetId);

    if (!source || source.userId !== user._id) {
      throw new Error("Source tag not found");
    }
    if (!target || target.userId !== user._id) {
      throw new Error("Target tag not found");
    }

    // Merge
    await mergeTagsInternal(ctx, args.sourceId, args.targetId);
    await ctx.db.delete(args.sourceId);

    return await ctx.db.get(args.targetId);
  },
});

/**
 * Helper: Merge junction entries from source to target
 * Deduplicates and updates usage counts
 */
async function mergeTagsInternal(
  ctx: MutationCtx,
  sourceId: Id<"tags">,
  targetId: Id<"tags">,
) {
  const tables = [
    { name: "bookmarkTags", field: "bookmarkId" },
    { name: "snippetTags", field: "snippetId" },
    { name: "noteTags", field: "noteId" },
    { name: "feedbackTagJunctions", field: "feedbackId" },
  ] as const;

  for (const { name, field } of tables) {
    const entries = await ctx.db
      .query(name)
      .withIndex("by_tag", (q) => q.eq("tagId", sourceId))
      .collect();

    for (const entry of entries) {
      // Check for duplicate (entity already has target tag)
      const entityId = (entry as any)[field];
      const duplicate = await ctx.db
        .query(name)
        .filter((q) =>
          q.and(
            q.eq(q.field(field), entityId),
            q.eq(q.field("tagId"), targetId),
          ),
        )
        .unique();

      if (!duplicate) {
        // Point to target tag
        await ctx.db.patch(entry._id, { tagId: targetId });
      } else {
        // Delete duplicate
        await ctx.db.delete(entry._id);
      }
    }
  }

  // Update usage counts
  const target = await ctx.db.get(targetId);
  const source = await ctx.db.get(sourceId);
  if (target && source) {
    await ctx.db.patch(targetId, {
      usageCount: target.usageCount + source.usageCount,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Helper: Update children paths recursively after parent rename
 */
async function updateChildrenPaths(ctx: MutationCtx, parentId: Id<"tags">) {
  const parent = await ctx.db.get(parentId);
  if (!parent) return;

  const children = await ctx.db
    .query("tags")
    .withIndex("by_parent", (q) => q.eq("parentId", parentId))
    .collect();

  for (const child of children) {
    const newPath = `${parent.path}/${child.slug}`;
    await ctx.db.patch(child._id, {
      path: newPath,
      updatedAt: Date.now(),
    });

    // Recursively update grandchildren
    await updateChildrenPaths(ctx, child._id);
  }
}

/**
 * Increment tag usage count (called when tag is added to entity)
 */
export const incrementUsage = mutation({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);
    if (!tag) return;

    await ctx.db.patch(args.tagId, {
      usageCount: tag.usageCount + 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Decrement tag usage count (called when tag is removed from entity)
 */
export const decrementUsage = mutation({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);
    if (!tag) return;

    await ctx.db.patch(args.tagId, {
      usageCount: Math.max(0, tag.usageCount - 1),
      updatedAt: Date.now(),
    });
  },
});
