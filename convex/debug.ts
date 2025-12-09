import { internalQuery } from "./_generated/server";

export const getLastMessage = internalQuery({
  handler: async (ctx) => {
    const message = await ctx.db.query("messages").order("desc").first();

    return {
      id: message?._id,
      role: message?.role,
      model: message?.model,
      sources: message?.sources,
      providerMetadata: message?.providerMetadata,
      contentPreview: message?.content.substring(0, 100),
    };
  },
});
