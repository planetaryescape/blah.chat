import { v } from "convex/values";
import { query } from "../_generated/server";

export const checkBudget = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get budget from admin settings
    const adminSettings = await ctx.db.query("adminSettings").first();
    const monthlyBudget = adminSettings?.defaultMonthlyBudget ?? 10;

    if (monthlyBudget === 0) {
      return {
        allowed: true,
        totalSpend: 0,
        budget: 0,
        percentUsed: 0,
        remaining: 0,
      };
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
    const percentUsed = totalSpend / monthlyBudget;

    return {
      allowed: totalSpend < monthlyBudget,
      totalSpend,
      budget: monthlyBudget,
      percentUsed,
      remaining: monthlyBudget - totalSpend,
    };
  },
});
