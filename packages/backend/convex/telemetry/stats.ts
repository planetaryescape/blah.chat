import { internalQuery } from "../_generated/server";

/**
 * Get daily statistics for telemetry heartbeat
 * Separated from heartbeat.ts because that file uses "use node"
 */
export const getDailyStats = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Count messages in last 24h
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();

    // Count unique users who sent messages
    const activeUsers = new Set(messages.map((m) => m.userId)).size;

    // Count total users
    const totalUsers = (await ctx.db.query("users").collect()).length;

    // Get admin settings to check features enabled
    const adminSettings = await ctx.db.query("adminSettings").first();

    return {
      messagesLast24h: messages.length,
      activeUsersLast24h: activeUsers,
      totalUsers,
      featuresEnabled: {
        autoMemoryExtract: adminSettings?.autoMemoryExtractEnabled ?? true,
        hybridSearch: adminSettings?.enableHybridSearch ?? false,
        budgetLimits: adminSettings?.budgetHardLimitEnabled ?? true,
      },
    };
  },
});
