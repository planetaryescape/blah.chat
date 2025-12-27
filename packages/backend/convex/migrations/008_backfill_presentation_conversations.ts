/**
 * Migration: Backfill isPresentation flag on existing presentation conversations
 *
 * Finds all presentations with linked conversations and marks those
 * conversations with isPresentation: true
 */

import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Check: Count presentations with linked conversations
 */
export const check = internalQuery({
  handler: async (ctx) => {
    const presentations = await ctx.db.query("presentations").collect();
    const withConversation = presentations.filter((p) => p.conversationId);
    return {
      totalPresentations: presentations.length,
      withConversation: withConversation.length,
    };
  },
});

/**
 * Backfill: Mark presentation conversations with isPresentation: true
 */
export const backfill = internalMutation({
  handler: async (ctx) => {
    const presentations = await ctx.db.query("presentations").collect();
    let updated = 0;
    let skipped = 0;
    let missing = 0;

    for (const presentation of presentations) {
      if (!presentation.conversationId) {
        skipped++;
        continue;
      }

      const conversation = await ctx.db.get(presentation.conversationId);
      if (!conversation) {
        missing++;
        continue;
      }

      if (conversation.isPresentation !== true) {
        await ctx.db.patch(presentation.conversationId, {
          isPresentation: true,
        });
        updated++;
      } else {
        skipped++;
      }
    }

    return {
      updated,
      skipped,
      missing,
      total: presentations.length,
    };
  },
});

/**
 * Verify: Check that all presentation conversations are marked
 */
export const verify = internalQuery({
  handler: async (ctx) => {
    const presentations = await ctx.db.query("presentations").collect();
    let marked = 0;
    let unmarked = 0;
    let missing = 0;

    for (const presentation of presentations) {
      if (!presentation.conversationId) continue;

      const conversation = await ctx.db.get(presentation.conversationId);
      if (!conversation) {
        missing++;
        continue;
      }

      if (conversation.isPresentation === true) {
        marked++;
      } else {
        unmarked++;
      }
    }

    return {
      marked,
      unmarked,
      missing,
      success: unmarked === 0,
    };
  },
});
