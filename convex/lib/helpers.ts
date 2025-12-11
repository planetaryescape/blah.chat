/**
 * Convex Internal Query Helpers
 *
 * These internal queries solve TypeScript's "Type instantiation is excessively deep"
 * errors by providing simple, focused queries that can be called from actions.
 *
 * Benefits:
 * - No type instantiation depth errors (simpler type signatures)
 * - Reusable across multiple actions
 * - Follows Convex best practices
 * - Easier to test and maintain
 *
 * Usage in actions:
 * ```typescript
 * import { internal } from "../_generated/api";
 *
 * const user = await ctx.runQuery(internal.lib.helpers.getCurrentUser, {});
 * const conversation = await ctx.runQuery(internal.lib.helpers.getConversation, { id });
 * ```
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";

/**
 * Get current authenticated user
 * Replaces: ctx.runQuery(api.users.getCurrentUser, {})
 */
export const getCurrentUser = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"users"> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/**
 * Get conversation by ID
 * Replaces: ctx.runQuery(internal.conversations.getInternal, { id })
 */
export const getConversation = internalQuery({
  args: { id: v.id("conversations") },
  handler: async (ctx, args): Promise<Doc<"conversations"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List messages for a conversation
 * Replaces: ctx.runQuery(internal.messages.listInternal, { conversationId })
 */
export const getConversationMessages = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

/**
 * Get project by ID
 * Replaces: ctx.runQuery(internal.projects.getInternal, { id })
 */
export const getProject = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args): Promise<Doc<"projects"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get memories by IDs (batch operation)
 * Replaces: ctx.runQuery(internal.memories.getMemoriesByIds, { ids })
 */
export const getMemoriesByIds = internalQuery({
  args: { ids: v.array(v.id("memories")) },
  handler: async (ctx, args): Promise<Doc<"memories">[]> => {
    const results = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return results.filter((m): m is Doc<"memories"> => m !== null);
  },
});

/**
 * Get single memory by ID
 * Replaces: ctx.runQuery(internal.memories.getMemoryById, { id })
 */
export const getMemoryById = internalQuery({
  args: { id: v.id("memories") },
  handler: async (ctx, args): Promise<Doc<"memories"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get feedback by ID
 * Replaces: ctx.runQuery(internal.feedback.getFeedbackInternal, { feedbackId })
 */
export const getFeedback = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args): Promise<Doc<"feedback"> | null> => {
    return await ctx.db.get(args.feedbackId);
  },
});

/**
 * Get note by ID
 * Replaces: ctx.runQuery(internal.notes.getInternal, { noteId })
 */
export const getNote = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<Doc<"notes"> | null> => {
    return await ctx.db.get(args.noteId);
  },
});

/**
 * List all memories for current user
 * Replaces: ctx.runQuery(api.memories.listAll, {})
 */
export const listAllMemories = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"memories">[]> => {
    return await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get attachments for a message
 * Replaces: ctx.db.query("attachments").withIndex("by_message", ...)
 */
export const getMessageAttachments = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args): Promise<Doc<"attachments">[]> => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});
