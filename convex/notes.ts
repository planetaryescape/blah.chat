import { v } from "convex/values";
import { nanoid } from "nanoid";
import { normalizeTagSlug } from "../src/lib/utils/tagUtils";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

/**
 * Helper to verify note ownership
 */
async function verifyOwnership(
  ctx: any,
  noteId: string,
): Promise<Doc<"notes">> {
  const user = await getCurrentUserOrCreate(ctx);
  const note = await ctx.db.get(noteId);

  if (!note || note.userId !== user._id) {
    throw new Error("Note not found");
  }

  return note;
}

/**
 * Extract title from content (first line or first heading)
 */
function extractTitle(content: string): string {
  const lines = content.split("\n").filter((line) => line.trim());
  if (!lines.length) return "Untitled Note";

  const firstLine = lines[0];
  // Remove markdown heading syntax
  return firstLine.replace(/^#+\s*/, "").trim() || "Untitled Note";
}

/**
 * Convert markdown to HTML (server-side version without DOMPurify)
 * Note: DOMPurify requires browser DOM, so we skip sanitization on server
 * Content is sanitized on client-side when rendering
 */
function markdownToHtml(markdown: string): string {
  // Basic markdown conversion for storage
  // The client will handle proper rendering with DOMPurify
  return markdown
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, "<p>$1</p>");
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new note
 */
export const createNote = mutation({
  args: {
    content: v.string(),
    title: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("messages")),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceSelectionText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const title = args.title || extractTitle(args.content);
    const htmlContent = markdownToHtml(args.content);

    const noteId = await ctx.db.insert("notes", {
      userId: user._id,
      title,
      content: args.content,
      htmlContent,
      sourceMessageId: args.sourceMessageId,
      sourceConversationId: args.sourceConversationId,
      sourceSelectionText: args.sourceSelectionText,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule auto-tagging (async, non-blocking)
    if (args.content.length >= 50) {
      // @ts-ignore - Type depth exceeded with internal reference
      await ctx.scheduler.runAfter(0, internal.notes.tags.extractAndApplyTags, {
        noteId,
      });
    }

    return noteId;
  },
});

/**
 * Update an existing note
 */
export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { noteId, ...updates }) => {
    await verifyOwnership(ctx, noteId);

    const patch: any = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Auto-update title from content if content changed but title not provided
    if (updates.content && !updates.title) {
      patch.title = extractTitle(updates.content);
    }

    // Generate HTML cache from markdown for fast display
    if (updates.content) {
      patch.htmlContent = markdownToHtml(updates.content);
    }

    await ctx.db.patch(noteId, patch);

    // Re-tag if content changed significantly
    if (updates.content && updates.content.length >= 50) {
      // @ts-ignore - Type depth exceeded with internal reference
      await ctx.scheduler.runAfter(0, internal.notes.tags.extractAndApplyTags, {
        noteId,
      });
    }
  },
});

/**
 * Delete a note
 */
export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    await verifyOwnership(ctx, noteId);
    await ctx.db.delete(noteId);
  },
});

/**
 * Toggle note pinned status
 */
export const togglePin = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    const note = await verifyOwnership(ctx, noteId);
    await ctx.db.patch(noteId, {
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Accept a suggested tag (move to active tags)
 */
export const acceptTag = mutation({
  args: {
    noteId: v.id("notes"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, tag }) => {
    const note = await verifyOwnership(ctx, noteId);

    const currentTags = note.tags || [];
    const suggestedTags = note.suggestedTags || [];

    // Skip if already in tags
    if (currentTags.includes(tag)) return;

    await ctx.db.patch(noteId, {
      tags: [...currentTags, tag],
      suggestedTags: suggestedTags.filter((t) => t !== tag),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Add a manual tag (DUAL-WRITE: Phase 5)
 * Writes to both new centralized tags system AND old array
 */
export const addTag = mutation({
  args: {
    noteId: v.id("notes"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, tag }) => {
    const note = await verifyOwnership(ctx, noteId);

    const currentTags = note.tags || [];
    const cleanTag = tag.trim().toLowerCase();

    // Validation
    if (!cleanTag || cleanTag.length < 2 || cleanTag.length > 30) {
      throw new Error("Invalid tag: must be 2-30 characters");
    }

    // Skip if duplicate in old system
    if (currentTags.includes(cleanTag)) return;

    // NEW SYSTEM: Get or create tag in centralized system
    const slug = normalizeTagSlug(tag);

    let centralTag = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", note.userId).eq("slug", slug),
      )
      .unique();

    if (!centralTag) {
      const now = Date.now();
      const tagId = await ctx.db.insert("tags", {
        slug,
        displayName: tag,
        userId: note.userId,
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

    // Create junction entry (check for duplicates)
    const existingJunction = await ctx.db
      .query("noteTags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_note_tag", (q) =>
        q.eq("noteId", noteId).eq("tagId", centralTag._id),
      )
      .unique();

    if (!existingJunction) {
      await ctx.db.insert("noteTags", {
        noteId,
        tagId: centralTag._id,
        userId: note.userId,
        createdAt: Date.now(),
      });

      // Increment usage count
      await ctx.db.patch(centralTag._id, {
        usageCount: centralTag.usageCount + 1,
        updatedAt: Date.now(),
      });
    }

    // OLD SYSTEM: Write to array (backward compatibility)
    await ctx.db.patch(noteId, {
      tags: [...currentTags, cleanTag],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation for adding tags (called from actions without auth context)
 */
export const addTagInternal = internalMutation({
  args: {
    noteId: v.id("notes"),
    userId: v.id("users"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, userId, tag }) => {
    // Verify ownership WITHOUT auth context
    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found");
    }

    const currentTags = note.tags || [];
    const cleanTag = tag.trim().toLowerCase();

    // Validation
    if (!cleanTag || cleanTag.length < 2 || cleanTag.length > 30) {
      throw new Error("Invalid tag: must be 2-30 characters");
    }

    // Skip if duplicate in old system
    if (currentTags.includes(cleanTag)) return;

    // NEW SYSTEM: Get or create tag in centralized system
    const slug = normalizeTagSlug(tag);

    let centralTag = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
      .unique();

    if (!centralTag) {
      const now = Date.now();
      const tagId = await ctx.db.insert("tags", {
        slug,
        displayName: tag,
        userId,
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

    // Create junction entry (check for duplicates)
    const existingJunction = await ctx.db
      .query("noteTags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_note_tag", (q) =>
        q.eq("noteId", noteId).eq("tagId", centralTag._id),
      )
      .unique();

    if (!existingJunction) {
      await ctx.db.insert("noteTags", {
        noteId,
        tagId: centralTag._id,
        userId,
        createdAt: Date.now(),
      });

      // Increment usage count
      await ctx.db.patch(centralTag._id, {
        usageCount: centralTag.usageCount + 1,
        updatedAt: Date.now(),
      });
    }

    // OLD SYSTEM: Write to array (backward compatibility)
    await ctx.db.patch(noteId, {
      tags: [...currentTags, cleanTag],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove a tag (DUAL-WRITE: Phase 5)
 * Removes from both new centralized system AND old array
 */
export const removeTag = mutation({
  args: {
    noteId: v.id("notes"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, tag }) => {
    const note = await verifyOwnership(ctx, noteId);

    // NEW SYSTEM: Find and delete junction entry
    const slug = normalizeTagSlug(tag);

    const centralTag = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", note.userId).eq("slug", slug),
      )
      .unique();

    if (centralTag) {
      // Find and delete junction entry
      const junction = await ctx.db
        .query("noteTags")
        // @ts-ignore - Type depth exceeded
        .withIndex("by_note_tag", (q) =>
          q.eq("noteId", noteId).eq("tagId", centralTag._id),
        )
        .unique();

      if (junction) {
        await ctx.db.delete(junction._id);

        // Decrement usage count
        await ctx.db.patch(centralTag._id, {
          usageCount: Math.max(0, centralTag.usageCount - 1),
          updatedAt: Date.now(),
        });
      }
    }

    // OLD SYSTEM: Remove from array (backward compatibility)
    await ctx.db.patch(noteId, {
      tags: (note.tags || []).filter((t) => t !== tag),
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Internal query for getting note (used by actions)
 */
export const getInternal = internalQuery({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    return await ctx.db.get(noteId);
  },
});

/**
 * Get a single note by ID
 */
export const getNote = query({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note) return null;

    const user = await getCurrentUser(ctx);
    if (!user || note.userId !== user._id) {
      return null;
    }

    return note;
  },
});

/**
 * List all notes for current user (sorted by updated date)
 */
export const listNotes = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("notes")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100); // Limit to most recent 100
  },
});

export const getNotesFromMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_source_message", (q) =>
        q.eq("sourceMessageId", args.messageId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .collect();

    return notes;
  },
});

/**
 * Get tag statistics for the current user
 */
export const getTagStats = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Aggregate tag counts
    const tagCounts = new Map<string, number>();

    for (const note of notes) {
      for (const tag of note.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Convert to array and sort by count descending
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Get tag co-occurrence analysis
 * Returns which tags appear together frequently
 */
export const getTagCooccurrence = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Build co-occurrence matrix
    const cooccurrenceMap = new Map<string, Map<string, number>>();

    for (const note of notes) {
      const noteTags = note.tags || [];

      // For each pair of tags in this note
      for (let i = 0; i < noteTags.length; i++) {
        for (let j = i + 1; j < noteTags.length; j++) {
          const tag1 = noteTags[i];
          const tag2 = noteTags[j];

          // Add to matrix (bidirectional)
          if (!cooccurrenceMap.has(tag1)) {
            cooccurrenceMap.set(tag1, new Map());
          }
          if (!cooccurrenceMap.has(tag2)) {
            cooccurrenceMap.set(tag2, new Map());
          }

          const tag1Map = cooccurrenceMap.get(tag1)!;
          const tag2Map = cooccurrenceMap.get(tag2)!;

          tag1Map.set(tag2, (tag1Map.get(tag2) || 0) + 1);
          tag2Map.set(tag1, (tag2Map.get(tag1) || 0) + 1);
        }
      }
    }

    // Convert to array format
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

/**
 * Rename a tag across all notes (DUAL-WRITE: Phase 5)
 * Uses centralized rename logic (auto-merge) + updates old arrays
 */
export const renameTag = mutation({
  args: {
    oldTag: v.string(),
    newTag: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { oldTag, newTag } = args;

    // Validation
    if (oldTag === newTag) {
      throw new Error("Old and new tag must be different");
    }

    if (newTag.length < 2 || newTag.length > 30) {
      throw new Error("Tag must be 2-30 characters");
    }

    // NEW SYSTEM: Use centralized rename (handles auto-merge)
    const oldSlug = normalizeTagSlug(oldTag);

    const oldCentralTag = await ctx.db
      .query("tags")
      // @ts-ignore - Type depth exceeded
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", oldSlug),
      )
      .unique();

    if (oldCentralTag) {
      // Use centralized rename mutation logic inline
      const newSlug = normalizeTagSlug(newTag);
      const existing = await ctx.db
        .query("tags")
        // @ts-ignore - Type depth exceeded
        .withIndex("by_user_slug", (q) =>
          q.eq("userId", user._id).eq("slug", newSlug),
        )
        .unique();

      if (existing && existing._id !== oldCentralTag._id) {
        // AUTO-MERGE: Move junction entries from old to existing
        const junctions = await ctx.db
          .query("noteTags")
          // @ts-ignore - Type depth exceeded
          .withIndex("by_tag", (q) => q.eq("tagId", oldCentralTag._id))
          .collect();

        for (const junction of junctions) {
          // Check if duplicate exists
          const duplicate = await ctx.db
            .query("noteTags")
            // @ts-ignore - Type depth exceeded
            .withIndex("by_note_tag", (q) =>
              q.eq("noteId", junction.noteId).eq("tagId", existing._id),
            )
            .unique();

          if (!duplicate) {
            await ctx.db.patch(junction._id, { tagId: existing._id });
          } else {
            await ctx.db.delete(junction._id);
          }
        }

        // Update usage counts
        await ctx.db.patch(existing._id, {
          usageCount: existing.usageCount + oldCentralTag.usageCount,
          updatedAt: Date.now(),
        });

        // Delete old tag
        await ctx.db.delete(oldCentralTag._id);
      } else {
        // Simple rename
        await ctx.db.patch(oldCentralTag._id, {
          slug: newSlug,
          displayName: newTag,
          path: `/${newSlug}`,
          updatedAt: Date.now(),
        });
      }
    }

    // OLD SYSTEM: Update arrays (backward compatibility)
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const notesWithTag = notes.filter((note) =>
      (note.tags || []).includes(oldTag),
    );

    for (const note of notesWithTag) {
      const updatedTags = (note.tags || []).map((tag) =>
        tag === oldTag ? newTag : tag,
      );

      await ctx.db.patch(note._id, { tags: updatedTags });
    }

    return { updated: notesWithTag.length };
  },
});

/**
 * Merge multiple tags into one
 */
export const mergeTags = mutation({
  args: {
    sourceTags: v.array(v.string()),
    targetTag: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { sourceTags, targetTag } = args;

    // Validation
    if (sourceTags.length === 0) {
      throw new Error("No source tags provided");
    }

    if (targetTag.length < 2 || targetTag.length > 30) {
      throw new Error("Target tag must be 2-30 characters");
    }

    // Get all notes
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let updatedCount = 0;

    for (const note of notes) {
      const noteTags = note.tags || [];
      const hasSourceTag = sourceTags.some((tag) => noteTags.includes(tag));

      if (hasSourceTag) {
        // Remove source tags, add target tag (avoid duplicates)
        const updatedTags = Array.from(
          new Set([
            ...noteTags.filter((tag) => !sourceTags.includes(tag)),
            targetTag,
          ]),
        );

        await ctx.db.patch(note._id, { tags: updatedTags });
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});

/**
 * Delete unused tags (tags not on any notes)
 */
export const cleanupOrphanedTags = mutation({
  args: {
    tagsToDelete: v.array(v.string()),
  },
  handler: async (ctx, _args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // This is a no-op since tags are stored on notes
    // Just here for API completeness - orphaned tags don't persist
    return { deleted: 0 };
  },
});

/**
 * Search notes (full-text search + filters)
 */
export const searchNotes = query({
  args: {
    searchQuery: v.string(),
    filterPinned: v.optional(v.boolean()),
    filterTags: v.optional(v.array(v.string())),
    tagFilterMode: v.optional(v.union(v.literal("AND"), v.literal("OR"))),
  },
  handler: async (
    ctx,
    { searchQuery, filterPinned, filterTags = [], tagFilterMode = "AND" },
  ) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let notes;

    if (!searchQuery || searchQuery.trim() === "") {
      // No search query: return recent notes
      notes = await ctx.db
        .query("notes")
        .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(100);
    } else {
      // Full-text search
      notes = await ctx.db
        .query("notes")
        .withSearchIndex("search_notes", (q) =>
          q.search("content", searchQuery).eq("userId", user._id),
        )
        .take(50);
    }

    // Client-side filter for pinned status
    if (filterPinned) {
      notes = notes.filter((n) => n.isPinned);
    }

    // Client-side filter for tags (with hierarchical support)
    if (filterTags.length > 0) {
      notes = notes.filter((note) => {
        const noteTags = note.tags || [];

        // Helper: check if noteTag matches filterTag (including children)
        // e.g., if filterTag is "work", match "work", "work/project-a", etc.
        const matchesTag = (noteTag: string, filterTag: string): boolean => {
          if (noteTag === filterTag) return true;
          // Check if noteTag is a child/descendant of filterTag
          return noteTag.startsWith(`${filterTag}/`);
        };

        if (tagFilterMode === "AND") {
          // ALL selected tags (or their descendants) must be present
          return filterTags.every((filterTag) =>
            noteTags.some((noteTag) => matchesTag(noteTag, filterTag)),
          );
        }
        // ANY selected tag (or its descendants) present
        return filterTags.some((filterTag) =>
          noteTags.some((noteTag) => matchesTag(noteTag, filterTag)),
        );
      });
    }

    // Sort: Pinned first, then by Last Updated
    notes.sort((a, b) => {
      // 1. Pinned status
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 2. Updated date (newest first)
      return b.updatedAt - a.updatedAt;
    });

    return notes;
  },
});

// ============================================================================
// SHARING EXPORTS
// ============================================================================

/**
 * Get note by share ID (public query - metadata only)
 */
export const getByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db
      .query("notes")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!note || !note.isPublic) return null;

    // Check expiry
    if (note.shareExpiresAt && note.shareExpiresAt < Date.now()) {
      return null;
    }

    return {
      _id: note._id,
      title: note.title,
      requiresPassword: !!note.sharePassword,
      expiresAt: note.shareExpiresAt,
      isPublic: note.isPublic,
    };
  },
});

/**
 * Get public note content (after password verification)
 */
export const getPublicNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note || !note.isPublic) return null;

    // Check expiry
    if (note.shareExpiresAt && note.shareExpiresAt < Date.now()) {
      return null;
    }

    // Return public-safe fields only
    return {
      _id: note._id,
      title: note.title,
      htmlContent: note.htmlContent,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  },
});

/**
 * Create a share for a note
 */
export const createShare = action({
  args: {
    noteId: v.id("notes"),
    password: v.optional(v.string()),
    expiresIn: v.optional(v.number()), // days
  },
  handler: async (ctx, args) => {
    // Get user via Clerk identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get user from DB
    const user: any = await ctx.runQuery(internal.notes.getUserInternal, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    // Verify note ownership
    const note = await ctx.runQuery(internal.notes.getInternal, {
      noteId: args.noteId,
    });
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found or unauthorized");
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (args.password) {
      hashedPassword = await ctx.runMutation(
        internal.shares.password.hashPassword,
        { password: args.password },
      );
    }

    // Calculate expiry
    let expiresAt: number | undefined;
    if (args.expiresIn) {
      expiresAt = Date.now() + args.expiresIn * 24 * 60 * 60 * 1000;
    }

    const shareId = nanoid(10);

    await ctx.runMutation(internal.notes.updateShareInternal, {
      noteId: args.noteId,
      shareId,
      sharePassword: hashedPassword,
      shareExpiresAt: expiresAt,
      shareCreatedAt: Date.now(),
    });

    return shareId;
  },
});

/**
 * Verify share password (if protected)
 */
export const verifyShare = action({
  args: {
    noteId: v.id("notes"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.runQuery(internal.notes.getInternal, {
      noteId: args.noteId,
    });

    if (!note || !note.isPublic) {
      throw new Error("Note not found or not shared");
    }

    // Check expiry
    if (note.shareExpiresAt && note.shareExpiresAt < Date.now()) {
      throw new Error("Share has expired");
    }

    // Verify password if required
    if (note.sharePassword) {
      if (!args.password) {
        throw new Error("Password required");
      }
      const valid = await ctx.runMutation(
        internal.shares.password.verifyPassword,
        {
          password: args.password,
          hash: note.sharePassword,
        },
      );
      if (!valid) {
        throw new Error("Invalid password");
      }
    }

    // Increment view count
    await ctx.runMutation(internal.notes.incrementShareViewCount, {
      noteId: args.noteId,
    });

    return true;
  },
});

/**
 * Toggle note sharing (enable/disable)
 */
export const toggleShare = mutation({
  args: {
    noteId: v.id("notes"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await verifyOwnership(ctx, args.noteId);

    await ctx.db.patch(args.noteId, {
      isPublic: args.isActive,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

export const updateShareInternal = internalMutation({
  args: {
    noteId: v.id("notes"),
    shareId: v.string(),
    sharePassword: v.optional(v.string()),
    shareExpiresAt: v.optional(v.number()),
    shareCreatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      shareId: args.shareId,
      isPublic: true,
      sharePassword: args.sharePassword,
      shareExpiresAt: args.shareExpiresAt,
      shareCreatedAt: args.shareCreatedAt,
      shareViewCount: 0,
      updatedAt: Date.now(),
    });
  },
});

export const incrementShareViewCount = internalMutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) return;

    await ctx.db.patch(args.noteId, {
      shareViewCount: (note.shareViewCount || 0) + 1,
    });
  },
});

export const getUserInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});
