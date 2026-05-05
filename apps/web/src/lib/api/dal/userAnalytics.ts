import "server-only";
import { z } from "zod";
import {
  getActionStats,
  getActivityStats,
  getByokBreakdown,
  getCostByFeature,
  getCostByType,
  getDailySpend,
  getHeatmap,
  getPercentileRanking,
  getSpendByModel,
  getStreaks,
  getTotalCounts,
  getUsageSummary,
} from "@/lib/persistence/usageAggregates";
import { formatEntity } from "@/lib/utils/formatEntity";

const dateRangeSchema = z.object({
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
});

const daysSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

/** Per-user analytics. Mirrors `/admin/usage/*` shape but always scopes to
 *  the caller's userId — no admin gate required. */
export const userAnalyticsDAL = {
  async summary(userId: string, input: unknown) {
    const range = dateRangeSchema.parse(input);
    const value = await getUsageSummary({ userId, ...range });
    return formatEntity(value, "usage_summary");
  },
  async dailySpend(userId: string, input: unknown) {
    const { days } = daysSchema.parse(input);
    const rows = await getDailySpend({ userId, days });
    return formatEntity(rows, "usage_daily_spend");
  },
  async spendByModelDetailed(userId: string, input: unknown) {
    const range = dateRangeSchema.parse(input);
    const rows = await getSpendByModel({ userId, ...range });
    return formatEntity(rows, "usage_spend_by_model");
  },
  async costByType(userId: string, input: unknown) {
    const range = dateRangeSchema.parse(input);
    const value = await getCostByType({ userId, ...range });
    return formatEntity(value, "usage_cost_by_type");
  },
  async costByFeature(userId: string, input: unknown) {
    const range = dateRangeSchema.parse(input);
    const value = await getCostByFeature({ userId, ...range });
    return formatEntity(value, "usage_cost_by_feature");
  },
  async activityStats(userId: string) {
    const value = await getActivityStats({ userId });
    return formatEntity(value, "usage_activity_stats");
  },
  async totalCounts(userId: string) {
    const value = await getTotalCounts({ userId });
    return formatEntity(value, "usage_total_counts");
  },
  async streaks(userId: string) {
    const value = await getStreaks({ userId });
    return formatEntity(value, "usage_streaks");
  },
  async heatmap(userId: string, input: unknown) {
    const { days } = daysSchema.parse(input);
    const rows = await getHeatmap({ userId, days });
    return formatEntity(rows, "usage_heatmap");
  },
  async percentileRanking(userId: string) {
    const value = await getPercentileRanking({ userId });
    return formatEntity(value, "usage_percentile_ranking");
  },
  async actionStats(userId: string) {
    const value = await getActionStats({ userId });
    return formatEntity(value, "usage_action_stats");
  },
  async byokBreakdown(userId: string, input: unknown) {
    const range = dateRangeSchema.parse(input);
    const value = await getByokBreakdown({ userId, ...range });
    return formatEntity(value, "usage_byok_breakdown");
  },
};
