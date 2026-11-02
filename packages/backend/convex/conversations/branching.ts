import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

/**
 * Check if user can access a conversation
 * Returns true if user is owner OR participant (for collaborative)
 */
export async function canAccessConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
): Promise<boolean> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return false;

  // Owner always has access
  if (conversation.userId === userId) return true;

  // Check participant table for collaborative conversations
  if (conversation.isCollaborative) {
    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId),
      )
      .first();

    return participant !== null;
  }

  return false;
}

/**
 * Get all participants for a conversation
 * Useful for showing who's in a collaborative conversation
 */
export const getParticipants = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Check access first
    const hasAccess = await canAccessConversation(
      ctx,
      args.conversationId,
      user._id,
    );
    if (!hasAccess) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.isCollaborative) return [];

    // Get participants
    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Fetch user details
    const participantsWithUsers = await Promise.all(
      participants.map(async (p) => {
        const participantUser = await ctx.db.get(p.userId);
        return {
          ...p,
          user: participantUser
            ? {
                _id: participantUser._id,
                name: participantUser.name,
                email: participantUser.email,
                imageUrl: participantUser.imageUrl,
              }
            : null,
        };
      }),
    );

    return participantsWithUsers;
  },
});

export const getChildBranches = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get child conversations that branch from this conversation
    const childBranches = await ctx.db
      .query("conversations")
      .withIndex("by_parent_conversation", (q) =>
        q.eq("parentConversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    return childBranches;
  },
});

export const getChildBranchesFromMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get child conversations that branch from this specific message
    const childBranches = await ctx.db
      .query("conversations")
      .withIndex("by_parent_conversation")
      .filter((q) =>
        q.and(
          q.eq(q.field("parentMessageId"), args.messageId),
          q.eq(q.field("userId"), user._id),
        ),
      )
      .collect();

    return childBranches;
  },
});
