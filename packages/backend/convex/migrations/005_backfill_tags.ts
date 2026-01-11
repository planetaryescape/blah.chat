/**
 * Phase 5: Backfill centralized tags system
 * Migrates tags from 4 entities (bookmarks, snippets, notes, feedback) to centralized tags table
 */

import { normalizeTagSlug } from "@/lib/utils/tagUtils";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Step 1: Backfill bookmarks tags
 */
export const backfillBookmarks = internalMutation({
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").collect();
    let tagsCreated = 0;
    let junctionsCreated = 0;

    for (const bookmark of bookmarks) {
      if (!bookmark.tags || bookmark.tags.length === 0) continue;

      // Deduplicate case-sensitive variants
      const tagsBySlug = new Map<string, string>();
      for (const rawTag of bookmark.tags) {
        const slug = normalizeTagSlug(rawTag);
        if (!tagsBySlug.has(slug)) {
          tagsBySlug.set(slug, rawTag); // First wins for displayName
        }
      }

      // Get or create tags
      for (const [slug, displayName] of tagsBySlug) {
        // Find existing tag
        let tag = await ctx.db
          .query("tags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_user_slug", (q) =>
            q.eq("userId", bookmark.userId).eq("slug", slug),
          )
          .unique();

        // Create if doesn't exist
        if (!tag) {
          const now = Date.now();
          const tagId = await ctx.db.insert("tags", {
            slug,
            displayName,
            userId: bookmark.userId,
            scope: "user",
            parentId: undefined,
            path: `/${slug}`,
            depth: 0,
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
          });
          tag = (await ctx.db.get(tagId))!;
          tagsCreated++;
        }

        // Create junction entry (check for duplicates)
        const exists = await ctx.db
          .query("bookmarkTags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_bookmark_tag", (q) =>
            q.eq("bookmarkId", bookmark._id).eq("tagId", tag._id),
          )
          .unique();

        if (!exists) {
          await ctx.db.insert("bookmarkTags", {
            bookmarkId: bookmark._id,
            tagId: tag._id,
            userId: bookmark.userId,
            createdAt: Date.now(),
          });

          // Increment usage count
          await ctx.db.patch(tag._id, {
            usageCount: tag.usageCount + 1,
            updatedAt: Date.now(),
          });

          junctionsCreated++;
        }
      }
    }

    return {
      entity: "bookmarks",
      tagsCreated,
      junctionsCreated,
      itemsProcessed: bookmarks.length,
    };
  },
});

/**
 * Step 2: Backfill snippets tags
 */
export const backfillSnippets = internalMutation({
  handler: async (ctx) => {
    const snippets = await ctx.db.query("snippets").collect();
    let tagsCreated = 0;
    let junctionsCreated = 0;

    for (const snippet of snippets) {
      if (!snippet.tags || snippet.tags.length === 0) continue;

      const tagsBySlug = new Map<string, string>();
      for (const rawTag of snippet.tags) {
        const slug = normalizeTagSlug(rawTag);
        if (!tagsBySlug.has(slug)) {
          tagsBySlug.set(slug, rawTag);
        }
      }

      for (const [slug, displayName] of tagsBySlug) {
        let tag = await ctx.db
          .query("tags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_user_slug", (q) =>
            q.eq("userId", snippet.userId).eq("slug", slug),
          )
          .unique();

        if (!tag) {
          const now = Date.now();
          const tagId = await ctx.db.insert("tags", {
            slug,
            displayName,
            userId: snippet.userId,
            scope: "user",
            parentId: undefined,
            path: `/${slug}`,
            depth: 0,
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
          });
          tag = (await ctx.db.get(tagId))!;
          tagsCreated++;
        }

        const exists = await ctx.db
          .query("snippetTags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_snippet_tag", (q) =>
            q.eq("snippetId", snippet._id).eq("tagId", tag._id),
          )
          .unique();

        if (!exists) {
          await ctx.db.insert("snippetTags", {
            snippetId: snippet._id,
            tagId: tag._id,
            userId: snippet.userId,
            createdAt: Date.now(),
          });

          await ctx.db.patch(tag._id, {
            usageCount: tag.usageCount + 1,
            updatedAt: Date.now(),
          });

          junctionsCreated++;
        }
      }
    }

    return {
      entity: "snippets",
      tagsCreated,
      junctionsCreated,
      itemsProcessed: snippets.length,
    };
  },
});

/**
 * Step 3: Backfill notes tags
 */
export const backfillNotes = internalMutation({
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();
    let tagsCreated = 0;
    let junctionsCreated = 0;

    for (const note of notes) {
      if (!note.tags || note.tags.length === 0) continue;

      const tagsBySlug = new Map<string, string>();
      for (const rawTag of note.tags) {
        const slug = normalizeTagSlug(rawTag);
        if (!tagsBySlug.has(slug)) {
          tagsBySlug.set(slug, rawTag);
        }
      }

      for (const [slug, displayName] of tagsBySlug) {
        let tag = await ctx.db
          .query("tags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_user_slug", (q) =>
            q.eq("userId", note.userId).eq("slug", slug),
          )
          .unique();

        if (!tag) {
          const now = Date.now();
          const tagId = await ctx.db.insert("tags", {
            slug,
            displayName,
            userId: note.userId,
            scope: "user",
            parentId: undefined,
            path: `/${slug}`,
            depth: 0,
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
          });
          tag = (await ctx.db.get(tagId))!;
          tagsCreated++;
        }

        const exists = await ctx.db
          .query("noteTags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_note_tag", (q) =>
            q.eq("noteId", note._id).eq("tagId", tag._id),
          )
          .unique();

        if (!exists) {
          await ctx.db.insert("noteTags", {
            noteId: note._id,
            tagId: tag._id,
            userId: note.userId,
            createdAt: Date.now(),
          });

          await ctx.db.patch(tag._id, {
            usageCount: tag.usageCount + 1,
            updatedAt: Date.now(),
          });

          junctionsCreated++;
        }
      }
    }

    return {
      entity: "notes",
      tagsCreated,
      junctionsCreated,
      itemsProcessed: notes.length,
    };
  },
});

/**
 * Step 4: Backfill feedback tags (migrate old feedbackTags table to global scope)
 */
export const backfillFeedbackTags = internalMutation({
  handler: async (ctx) => {
    const oldFeedbackTags = await ctx.db.query("feedbackTags").collect();
    let tagsCreated = 0;

    for (const oldTag of oldFeedbackTags) {
      const slug = normalizeTagSlug(oldTag.name);

      // Check if global tag already exists
      const exists = await ctx.db
        .query("tags")
        // @ts-ignore - Type depth exceeded
        .withIndex("by_scope", (q) => q.eq("scope", "global"))
        .filter((q) => q.eq(q.field("slug"), slug))
        .unique();

      if (!exists) {
        const now = Date.now();
        await ctx.db.insert("tags", {
          slug,
          displayName: oldTag.name,
          userId: undefined, // Global tags have no user
          scope: "global",
          parentId: undefined,
          path: `/${slug}`,
          depth: 0,
          usageCount: oldTag.usageCount,
          color: oldTag.color,
          description: undefined,
          createdAt: oldTag.createdAt,
          updatedAt: now,
        });
        tagsCreated++;
      }
    }

    // Now migrate feedback.tags arrays to junction table
    const feedbacks = await ctx.db.query("feedback").collect();
    let junctionsCreated = 0;

    for (const feedback of feedbacks) {
      if (!feedback.tags || feedback.tags.length === 0) continue;

      for (const rawTag of feedback.tags) {
        const slug = normalizeTagSlug(rawTag);

        // Find the global tag
        const tag = await ctx.db
          .query("tags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_scope", (q) => q.eq("scope", "global"))
          .filter((q) => q.eq(q.field("slug"), slug))
          .unique();

        if (!tag) continue; // Skip if tag doesn't exist

        // Create junction entry
        const exists = await ctx.db
          .query("feedbackTagJunctions")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_feedback_tag", (q) =>
            q.eq("feedbackId", feedback._id).eq("tagId", tag._id),
          )
          .unique();

        if (!exists) {
          await ctx.db.insert("feedbackTagJunctions", {
            feedbackId: feedback._id,
            tagId: tag._id,
            userId: feedback.userId,
            createdAt: Date.now(),
          });
          junctionsCreated++;
        }
      }
    }

    return {
      entity: "feedback",
      tagsCreated,
      junctionsCreated,
      itemsProcessed: feedbacks.length,
    };
  },
});

/**
 * Orchestrator action: Run all backfill steps sequentially
 */
export const runBackfill = internalAction({
  handler: async (ctx): Promise<any> => {
    logger.info("Starting backfill", { tag: "Migration", phase: 5 });

    const bookmarksResult = (await (ctx.runMutation as any)(
      // @ts-ignore - Type depth exceeded with internal mutations
      internal.migrations["005_backfill_tags"].backfillBookmarks,
    )) as any;
    logger.info("Bookmarks processed", {
      tag: "Migration",
      ...bookmarksResult,
    });

    const snippetsResult = (await (ctx.runMutation as any)(
      // @ts-ignore - Type depth exceeded with internal mutations
      internal.migrations["005_backfill_tags"].backfillSnippets,
    )) as any;
    logger.info("Snippets processed", { tag: "Migration", ...snippetsResult });

    const notesResult = (await (ctx.runMutation as any)(
      // @ts-ignore - Type depth exceeded with internal mutations
      internal.migrations["005_backfill_tags"].backfillNotes,
    )) as any;
    logger.info("Notes processed", { tag: "Migration", ...notesResult });

    const feedbackResult = (await (ctx.runMutation as any)(
      // @ts-ignore - Type depth exceeded with internal mutations
      internal.migrations["005_backfill_tags"].backfillFeedbackTags,
    )) as any;
    logger.info("Feedback processed", { tag: "Migration", ...feedbackResult });

    const totalTags =
      bookmarksResult.tagsCreated +
      snippetsResult.tagsCreated +
      notesResult.tagsCreated +
      feedbackResult.tagsCreated;

    const totalJunctions =
      bookmarksResult.junctionsCreated +
      snippetsResult.junctionsCreated +
      notesResult.junctionsCreated +
      feedbackResult.junctionsCreated;

    const deduplicationRatio =
      totalJunctions > 0
        ? ((totalJunctions - totalTags) / totalJunctions) * 100
        : 0;

    logger.info("Migration complete", {
      tag: "Migration",
      phase: 5,
      totalTags,
      totalJunctions,
      deduplicationRatio: `${deduplicationRatio.toFixed(2)}%`,
    });

    return {
      bookmarks: bookmarksResult,
      snippets: snippetsResult,
      notes: notesResult,
      feedback: feedbackResult,
      summary: {
        totalTags,
        totalJunctions,
        deduplicationRatio: `${deduplicationRatio.toFixed(2)}%`,
      },
    };
  },
});

/**
 * Verification action: Check migration integrity
 */
export const verifyMigration = internalAction({
  handler: async (ctx): Promise<any> => {
    logger.info("Verifying migration", { tag: "Migration", phase: 5 });

    // Get migration stats
    const stats = (await (ctx.runMutation as any)(
      // @ts-ignore - Type depth exceeded with internal mutations
      internal.migrations["005_backfill_tags"].getMigrationStats,
    )) as any;

    const totalTags = stats.totalTags;
    const junctionCounts = stats.junctions;

    logger.info("Verification complete", {
      tag: "Migration",
      totalTags,
      junctions: junctionCounts,
    });

    return {
      totalTags,
      junctionCounts,
    };
  },
});

/**
 * Helper: Count total tags
 */
export const countTags = internalMutation({
  handler: async (ctx) => {
    const tags = await ctx.db.query("tags").collect();
    return tags.length;
  },
});

/**
 * Helper: Count junction entries per table
 */
export const countJunctions = internalMutation({
  handler: async (ctx) => {
    const bookmarkTags = await ctx.db.query("bookmarkTags").collect();
    const snippetTags = await ctx.db.query("snippetTags").collect();
    const noteTags = await ctx.db.query("noteTags").collect();
    const feedbackTags = await ctx.db.query("feedbackTagJunctions").collect();

    return {
      bookmarkTags: bookmarkTags.length,
      snippetTags: snippetTags.length,
      noteTags: noteTags.length,
      feedbackTags: feedbackTags.length,
      total:
        bookmarkTags.length +
        snippetTags.length +
        noteTags.length +
        feedbackTags.length,
    };
  },
});

/**
 * Simple verification query (for public access)
 */
export const getMigrationStats = internalMutation({
  handler: async (ctx) => {
    const tags = await ctx.db.query("tags").collect();
    const bookmarkTags = await ctx.db.query("bookmarkTags").collect();
    const snippetTags = await ctx.db.query("snippetTags").collect();
    const noteTags = await ctx.db.query("noteTags").collect();
    const feedbackTags = await ctx.db.query("feedbackTagJunctions").collect();

    return {
      totalTags: tags.length,
      junctions: {
        bookmarkTags: bookmarkTags.length,
        snippetTags: snippetTags.length,
        noteTags: noteTags.length,
        feedbackTags: feedbackTags.length,
        total:
          bookmarkTags.length +
          snippetTags.length +
          noteTags.length +
          feedbackTags.length,
      },
    };
  },
});
