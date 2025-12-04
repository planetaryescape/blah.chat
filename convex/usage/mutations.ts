import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const recordTranscription = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    durationMinutes: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      inputTokens: 0,
      outputTokens: 0,
      cost: args.cost,
      messageCount: 1,
    });
  },
});
