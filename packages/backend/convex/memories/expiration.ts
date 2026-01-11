import { internalMutation } from "../_generated/server";
import { logger } from "../lib/logger";

export const markExpired = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - 90 * 24 * 60 * 60 * 1000; // 90 days ago

    // Find very old expired memories (soft delete → hard delete after 90 days)
    const allMemories = await ctx.db.query("memories").collect();

    let deletedCount = 0;

    for (const memory of allMemories) {
      if (memory.metadata?.expiresAt && memory.metadata.expiresAt < cutoff) {
        await ctx.db.delete(memory._id);
        deletedCount++;
      }
    }

    logger.info("Deleted expired memories", {
      tag: "Cron",
      deletedCount,
      threshold: ">90 days old",
    });
    return { deletedCount };
  },
});
