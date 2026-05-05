import "server-only";
import { z } from "zod";
import {
  getConversationCosts,
  getCostByFeature,
  getDailySpend,
  getMonthlyTotal,
  getSpendByModel,
  getTotalUserCount,
} from "@/lib/persistence/usageAggregates";
import { formatEntity } from "@/lib/utils/formatEntity";

const dateRangeSchema = z.object({
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
});

const daysSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

const limitSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminUsageDAL = {
  async monthlyTotal() {
    const value = await getMonthlyTotal();
    return formatEntity(value, "admin_usage_monthly_total", "global");
  },

  async dailySpend(input: unknown) {
    const { days } = daysSchema.parse(input);
    const rows = await getDailySpend({ days });
    return formatEntity(rows, "admin_usage_daily_spend");
  },

  async spendByModel(input: unknown) {
    const { days } = daysSchema.parse(input);
    const rows = await getSpendByModel({ days });
    return formatEntity(rows, "admin_usage_spend_by_model");
  },

  async conversationCosts(input: unknown) {
    const { limit } = limitSchema.parse(input);
    const rows = await getConversationCosts({ limit });
    return formatEntity(rows, "admin_usage_conversation_costs");
  },

  async costByFeature(input: unknown) {
    const { startDate, endDate } = dateRangeSchema.parse(input);
    const value = await getCostByFeature({ startDate, endDate });
    return formatEntity(value, "admin_usage_cost_by_feature");
  },

  async userCount() {
    const value = await getTotalUserCount();
    return formatEntity(value, "admin_user_count", "global");
  },
};
