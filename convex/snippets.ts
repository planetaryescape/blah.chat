import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
