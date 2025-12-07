import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>');
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

    // Schedule tag extraction (async, non-blocking)
    if (args.content.length >= 50) {
      // @ts-ignore - Convex type instantiation depth issue
      await ctx.scheduler.runAfter(0, internal.notes.tags.extractTags, {
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

    // Re-extract tags if content changed significantly
    if (updates.content && updates.content.length >= 50) {
      // @ts-ignore - Convex type instantiation depth issue
      await ctx.scheduler.runAfter(0, internal.notes.tags.extractTags, {
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
 * Add a manual tag
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

    // Skip if duplicate
    if (currentTags.includes(cleanTag)) return;

    await ctx.db.patch(noteId, {
      tags: [...currentTags, cleanTag],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove a tag
 */
export const removeTag = mutation({
  args: {
    noteId: v.id("notes"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, tag }) => {
    const note = await verifyOwnership(ctx, noteId);

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

/**
 * Search notes (full-text search + filters)
 */
export const searchNotes = query({
  args: {
    searchQuery: v.string(),
    filterPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { searchQuery, filterPinned }) => {
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

    return notes;
  },
});
