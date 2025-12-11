// Verification helper: Check if dual-write is working for latest messages
import { internalQuery } from "../_generated/server";

export const checkLatestMessage = internalQuery({
  handler: async (ctx) => {
    // Get latest message with tool calls
    const latestMessages = await ctx.db
      .query("messages")
      .order("desc")
      .take(5);

    const results = [];

    for (const msg of latestMessages) {
      if (!(msg as any).toolCalls && !(msg as any).partialToolCalls) continue;

      // Check old structure
      const oldToolCalls = (msg as any).toolCalls?.length || 0;
      const oldPartials = (msg as any).partialToolCalls?.length || 0;

      // Check new table
      const newToolCalls = await ctx.db
        .query("toolCalls")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      const newComplete = newToolCalls.filter((tc) => !tc.isPartial).length;
      const newPartial = newToolCalls.filter((tc) => tc.isPartial).length;

      results.push({
        messageId: msg._id,
        createdAt: new Date(msg.createdAt).toISOString(),
        old: { toolCalls: oldToolCalls, partials: oldPartials },
        new: { complete: newComplete, partial: newPartial },
        dualWriteWorking: oldToolCalls === newComplete,
      });
    }

    return results;
  },
});
