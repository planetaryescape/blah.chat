import { v } from "convex/values";
import { normalizeTagSlug } from "../../src/lib/utils/tagUtils";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";

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
 * Phase 5: User-scoped tag queries
 * Critical: ALWAYS filter by userId to prevent tag leaks across user boundaries
 */

/**
 * Autocomplete tags for user (sorted by relevance)
 * - Exact match first
 * - Then by usage count
 * - Then alphabetically
 */
export const autocomplete = query({
  args: {
    prefix: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const normalizedPrefix = normalizeTagSlug(args.prefix);

    // Query tags with user boundary
    const tags = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded with complex Convex query
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("slug"), normalizedPrefix))
      .take(args.limit ?? 20);

    // Sort: exact match > usage > alpha
    return tags.sort((a, b) => {
      const aExact = a.slug === normalizedPrefix;
      const bExact = b.slug === normalizedPrefix;
      if (aExact !== bExact) return aExact ? -1 : 1;
      if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
      return a.displayName.localeCompare(b.displayName);
    });
  },
});

/**
 * Get popular tags for user (sorted by usage count)
 */
export const getPopular = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return (
      ctx.db
        .query("tags")
        // @ts-ignore - Type depth exceeded with complex Convex query
        .withIndex("by_user_usage", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(args.limit ?? 50)
    );
  },
});

/**
 * Get all tags for a specific entity (bookmark, snippet, note, feedback)
 * Returns both user-scoped and global tags
 */
export const getByEntity = query({
  args: {
    entityType: v.union(
      v.literal("bookmark"),
      v.literal("snippet"),
      v.literal("note"),
      v.literal("feedback"),
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Map entity type to junction table
    const junctionTableMap = {
      bookmark: "bookmarkTags",
      snippet: "snippetTags",
      note: "noteTags",
      feedback: "feedbackTagJunctions",
    } as const;

    const junctionTable = junctionTableMap[args.entityType];
    const entityIdField = `${args.entityType}Id` as const;

    // Get junction entries
    // @ts-ignore - Type depth exceeded with complex Convex query
    const junctions = await ctx.db
      .query(junctionTable)
      .withIndex(`by_${args.entityType}` as any, (q: any) =>
        q.eq(entityIdField, args.entityId),
      )
      .collect();

    // Get tag details
    const tagPromises = junctions.map((j) => ctx.db.get((j as any).tagId));
    const tags = await Promise.all(tagPromises);

    // CRITICAL: Filter by ownership (user tags + global tags)
    // Type assertion needed because tags array could contain null values
    return tags.filter(
      (t): t is NonNullable<typeof t> =>
        t !== null &&
        // @ts-ignore - Type narrowing for tags table (scope and userId properties)
        (t.scope === "global" || t.userId === user._id),
    );
  },
});

/**
 * Get all user tags (for tag management UI)
 */
export const getAllUserTags = query({
  args: {
    includeGlobal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const userTags = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded with complex Convex query
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id))
      .collect();

    // Optionally include global tags
    if (args.includeGlobal) {
      const globalTags = await ctx.db
        .query("tags")
        // @ts-ignore - Type depth exceeded with complex Convex query
        .withIndex("by_scope", (q) => q.eq("scope", "global"))
        .collect();

      return [...userTags, ...globalTags];
    }

    return userTags;
  },
});

/**
 * Get tag stats for user (tag counts across all entities)
 * Returns backward-compatible format for dual-write phase
 */
export const getTagStats = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const tags = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded with complex Convex query
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id))
      .collect();

    // Backward-compatible format for frontend components
    return tags
      .map((tag) => ({
        tag: tag.displayName, // Compatibility alias
        count: tag.usageCount, // Compatibility alias
        _id: tag._id,
        slug: tag.slug,
        displayName: tag.displayName,
        usageCount: tag.usageCount,
        color: tag.color,
      }))
      .sort((a, b) => b.count - a.count); // Sort by usage descending
  },
});

/**
 * Get a single tag by ID (with ownership check)
 */
export const getById = query({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const tag = await ctx.db.get(args.tagId);

    // CRITICAL: Verify ownership or global scope
    if (!tag) return null;
    if (tag.scope === "global") return tag;
    if (tag.userId === user._id) return tag;

    // Privacy pattern: return null (not unauthorized)
    return null;
  },
});

/**
 * Get tag co-occurrence analysis (which tags appear together)
 * Uses centralized junction tables instead of scanning arrays
 */
export const getTagCooccurrence = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get all user's tags
    const userTags = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded with complex Convex query
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id))
      .collect();

    // Build co-occurrence matrix from junction tables
    const cooccurrenceMap = new Map<string, Map<string, number>>();

    // Initialize map with all tags
    for (const tag of userTags) {
      cooccurrenceMap.set(tag.displayName, new Map());
    }

    // Analyze noteTags junction table
    const noteTags = await ctx.db
      .query("noteTags")
      // @ts-ignore - Type depth exceeded with complex Convex query
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Group by noteId
    const noteTagGroups = new Map<string, string[]>();
    for (const junction of noteTags) {
      const tag = await ctx.db.get(junction.tagId);
      if (!tag) continue;

      const noteId = junction.noteId;
      if (!noteTagGroups.has(noteId)) {
        noteTagGroups.set(noteId, []);
      }
      noteTagGroups.get(noteId)?.push(tag.displayName);
    }

    // Calculate co-occurrence from note groups
    for (const tags of noteTagGroups.values()) {
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const tag1 = tags[i];
          const tag2 = tags[j];

          const tag1Map = cooccurrenceMap.get(tag1);
          const tag2Map = cooccurrenceMap.get(tag2);

          if (tag1Map && tag2Map) {
            tag1Map.set(tag2, (tag1Map.get(tag2) || 0) + 1);
            tag2Map.set(tag1, (tag2Map.get(tag1) || 0) + 1);
          }
        }
      }
    }

    // TODO: Add bookmarkTags and snippetTags analysis if needed
    // (Currently only analyzing notes, as that's where most tags are)

    // Convert to array format (backward-compatible)
    const result: Array<{
      tag: string;
      relatedTags: Array<{ tag: string; count: number }>;
    }> = [];

    for (const [tag, relatedMap] of cooccurrenceMap.entries()) {
      const relatedTags = Array.from(relatedMap.entries())
        .map(([relatedTag, count]) => ({ tag: relatedTag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 related tags

      result.push({ tag, relatedTags });
    }

    return result.sort((a, b) => a.tag.localeCompare(b.tag));
  },
});
