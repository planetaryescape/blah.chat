import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Check message model field coverage
 */
export const getMessagesWithoutModel = internalQuery({
  handler: async (ctx) => {
    const messages = await ctx.db
      .query("messages")
      .collect();

    const withoutModel = messages.filter(m => !m.model && m.role === "assistant");
    const assistantMessages = messages.filter(m => m.role === "assistant");

    return {
      total: messages.length,
      assistantMessages: assistantMessages.length,
      withoutModel: withoutModel.length,
      percentage: assistantMessages.length > 0
        ? ((withoutModel.length / assistantMessages.length) * 100).toFixed(1)
        : "0",
    };
  },
});

/**
 * Backfill model field for messages without it
 */
export const backfillMessageModels = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    let updated = 0;
    let skipped = 0;

    // Get messages without model
    const messages = await ctx.db
      .query("messages")
      .collect();

    for (const msg of messages) {
      // Only process assistant messages without model
      if (msg.role === "assistant" && !msg.model) {
        // Get conversation to infer model
        const conversation = await ctx.db.get(msg.conversationId);

        if (conversation?.model) {
          await ctx.db.patch(msg._id, {
            model: conversation.model,
          });
          updated++;
        } else {
          // No conversation model available, use fallback
          await ctx.db.patch(msg._id, {
            model: "unknown:legacy",
          });
          updated++;
        }

        if (updated + skipped >= batchSize) break;
      } else {
        skipped++;
      }
    }

    return { updated, skipped };
  },
});
