import { internalQuery } from "./_generated/server";

export const getLastMessage = internalQuery({
  handler: async (ctx) => {
    const message = await ctx.db.query("messages").order("desc").first();

    // Get sources from normalized table
    const sources = message
      ? await ctx.db
          .query("sources")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect()
      : [];

    return {
      id: message?._id,
      role: message?.role,
      model: message?.model,
      sourcesCount: sources.length,
      providerMetadata: message?.providerMetadata,
      contentPreview: message?.content.substring(0, 100),
    };
  },
});
