import { v } from "convex/values";
import { query } from "../_generated/server";

export const checkBudget = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.monthlyBudget) {
      return { allowed: true, totalSpend: 0, budget: 0, percentUsed: 0, remaining: 0 };
    }

    // Get current month records
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("date"), monthStart))
      .collect();

    const totalSpend = records.reduce((sum, r) => sum + r.cost, 0);
    const percentUsed = totalSpend / user.monthlyBudget;

    return {
      allowed: totalSpend < user.monthlyBudget,
      totalSpend,
      budget: user.monthlyBudget,
      percentUsed,
      remaining: user.monthlyBudget - totalSpend,
    };
  },
});
