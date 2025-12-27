import { internalMutation } from "../_generated/server";

export const calculateAllUserRankings = internalMutation({
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    // Get usage from last 30 days for ranking calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    // Get all usage records in date range
    const allRecords = await ctx.db
      .query("usageRecords")
      .filter((q) => q.gte(q.field("date"), startDate))
      .collect();

    // Group by user
    const userUsage: Record<
      string,
      {
        totalCost: number;
        modelUsage: Record<string, number>;
      }
    > = {};

    for (const record of allRecords) {
      const userId = record.userId;
      if (!userUsage[userId]) {
        userUsage[userId] = { totalCost: 0, modelUsage: {} };
      }
      userUsage[userId].totalCost += record.cost;

      const model = record.model;
      if (!userUsage[userId].modelUsage[model]) {
        userUsage[userId].modelUsage[model] = 0;
      }
      userUsage[userId].modelUsage[model] += record.cost;
    }

    const userIds = Object.keys(userUsage);
    const totalActiveUsers = userIds.length;

    if (totalActiveUsers === 0) {
      return { processed: 0 };
    }

    // Sort users by total cost for overall ranking
    const sortedByTotal = userIds.sort(
      (a, b) => userUsage[b].totalCost - userUsage[a].totalCost,
    );

    // Collect all models used
    const allModels = new Set<string>();
    for (const userId of userIds) {
      for (const model of Object.keys(userUsage[userId].modelUsage)) {
        allModels.add(model);
      }
    }

    // Calculate per-model rankings
    const modelRankings: Record<
      string,
      { userIds: string[]; totalUsers: number }
    > = {};

    for (const model of allModels) {
      const usersWithModel = userIds.filter(
        (userId) => userUsage[userId].modelUsage[model] > 0,
      );
      const sorted = usersWithModel.sort(
        (a, b) =>
          userUsage[b].modelUsage[model] - userUsage[a].modelUsage[model],
      );
      modelRankings[model] = {
        userIds: sorted,
        totalUsers: sorted.length,
      };
    }

    // Calculate percentiles and save for each user
    let processed = 0;

    for (let i = 0; i < sortedByTotal.length; i++) {
      const userId = sortedByTotal[i];
      // Percentile: 100 means top user, 0 means bottom
      const overallPercentile = Math.round(
        ((sortedByTotal.length - 1 - i) / (sortedByTotal.length - 1 || 1)) *
          100,
      );

      // Calculate per-model percentiles for this user
      const userModelRankings: {
        model: string;
        percentile: number;
        totalUsers: number;
      }[] = [];

      for (const model of Object.keys(userUsage[userId].modelUsage)) {
        if (userUsage[userId].modelUsage[model] > 0) {
          const ranking = modelRankings[model];
          const position = ranking.userIds.indexOf(userId);
          const percentile = Math.round(
            ((ranking.totalUsers - 1 - position) /
              (ranking.totalUsers - 1 || 1)) *
              100,
          );
          userModelRankings.push({
            model,
            percentile,
            totalUsers: ranking.totalUsers,
          });
        }
      }

      // Sort by percentile descending (best rankings first)
      userModelRankings.sort((a, b) => b.percentile - a.percentile);

      // Check if ranking already exists for today
      const existing = await ctx.db
        .query("userRankings")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId as any).eq("date", today),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          overallPercentile,
          modelRankings: userModelRankings,
          totalActiveUsers,
        });
      } else {
        await ctx.db.insert("userRankings", {
          userId: userId as any,
          date: today,
          overallPercentile,
          modelRankings: userModelRankings,
          totalActiveUsers,
        });
      }

      processed++;
    }

    return { processed, totalActiveUsers };
  },
});
