import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUserOrCreate } from "./lib/userSync";

export const createSnippet = mutation({
  args: {
    text: v.string(),
    sourceMessageId: v.id("messages"),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Get the source message to find conversation ID
    const sourceMessage = await ctx.db.get(args.sourceMessageId);
    if (!sourceMessage) throw new Error("Source message not found");

    return await ctx.db.insert("snippets", {
      userId: user._id,
      text: args.text,
      sourceMessageId: args.sourceMessageId,
      sourceConversationId: sourceMessage.conversationId,
      note: args.note,
      tags: args.tags,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// TAG OPERATIONS (DUAL-WRITE: Phase 5)
// ============================================================================

/**
 * Add a tag to snippet (DUAL-WRITE: Phase 5)
 */
export const addTag = mutation({
  args: {
    snippetId: v.id("snippets"),
    tag: v.string(),
  },
  handler: async (ctx, { snippetId, tag }) => {
    const user = await getCurrentUserOrCreate(ctx);
    const snippet = await ctx.db.get(snippetId);

    if (!snippet || snippet.userId !== user._id) {
      throw new Error("Snippet not found");
    }

    const currentTags = snippet.tags || [];
    const cleanTag = tag.trim().toLowerCase();

    if (currentTags.includes(cleanTag)) return;

    // NEW SYSTEM: Get or create tag
    const { normalizeTagSlug } = await import("@/lib/utils/tagUtils");
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
      .query("snippetTags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_snippet_tag", (q) =>
        q.eq("snippetId", snippetId).eq("tagId", centralTag._id),
      )
      .unique();

    if (!existingJunction) {
      await ctx.db.insert("snippetTags", {
        snippetId,
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
    await ctx.db.patch(snippetId, {
      tags: [...currentTags, cleanTag],
    });
  },
});

/**
 * Remove a tag from snippet (DUAL-WRITE: Phase 5)
 */
export const removeTag = mutation({
  args: {
    snippetId: v.id("snippets"),
    tag: v.string(),
  },
  handler: async (ctx, { snippetId, tag }) => {
    const user = await getCurrentUserOrCreate(ctx);
    const snippet = await ctx.db.get(snippetId);

    if (!snippet || snippet.userId !== user._id) {
      throw new Error("Snippet not found");
    }

    // NEW SYSTEM: Find and delete junction entry
    const { normalizeTagSlug } = await import("@/lib/utils/tagUtils");
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
        .query("snippetTags")
        // @ts-ignore - Type depth exceeded
        .withIndex("by_snippet_tag", (q) =>
          q.eq("snippetId", snippetId).eq("tagId", centralTag._id),
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
    await ctx.db.patch(snippetId, {
      tags: (snippet.tags || []).filter((t) => t !== tag),
    });
  },
});
