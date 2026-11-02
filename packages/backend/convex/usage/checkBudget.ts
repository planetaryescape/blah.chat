import { v } from "convex/values";
import { internal } from "../_generated/api";
import { query } from "../_generated/server";
import { getMonthlySpend } from "../lib/monthlyBudget";
import { getCurrentUser } from "../lib/userSync";

export const checkBudget = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user._id !== args.userId) throw new Error("Unauthorized");

    // Get budget from admin settings (with env var overrides)
    const adminSettings = await ((ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.adminSettings.getWithEnvOverrides,
    ) as Promise<{
      defaultMonthlyBudget: number;
      budgetHardLimitEnabled: boolean;
    }>);
    const monthlyBudget = adminSettings.defaultMonthlyBudget;

    if (monthlyBudget === 0) {
      return {
        allowed: true,
        totalSpend: 0,
        budget: 0,
        percentUsed: 0,
        remaining: 0,
      };
    }

    const totalSpend = await getMonthlySpend(ctx, user._id);
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
