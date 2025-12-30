import { api } from "@blah-chat/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Stack } from "expo-router";
import { BarChart2, DollarSign, MessageSquare } from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

export default function UsageScreen() {
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const monthlyTotal = useQuery(api.usage.queries.getMonthlyTotal) as
    | {
        cost: number;
        tokens: number;
        requests: number;
        budget: number;
        percentUsed: number;
      }
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const dailySpend = useQuery(api.usage.queries.getDailySpend, { days: 14 }) as
    | Array<{ date: string; cost: number; tokens: number }>
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const modelBreakdown = useQuery(api.usage.queries.getSpendByModel, {
    days: 30,
  }) as
    | Array<{ model: string; cost: number; tokens: number; requests: number }>
    | undefined;

  const maxDailyCost = useMemo(() => {
    if (!dailySpend?.length) return 1;
    return Math.max(...dailySpend.map((d) => d.cost), 0.01);
  }, [dailySpend]);

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getModelColor = (index: number) => {
    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#84cc16",
    ];
    return colors[index % colors.length];
  };

  if (
    monthlyTotal === undefined ||
    dailySpend === undefined ||
    modelBreakdown === undefined
  ) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Usage" }} />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Usage Statistics" }} />

      {/* Monthly Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <DollarSign size={20} color={colors.success} />
            </View>
            <Text style={styles.statValue}>
              {formatCost(monthlyTotal.cost)}
            </Text>
            <Text style={styles.statLabel}>Total Spend</Text>
          </View>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <MessageSquare size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{monthlyTotal.requests}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
          <View style={styles.statCard}>
            <View
              style={[styles.statIcon, { backgroundColor: `${colors.link}15` }]}
            >
              <BarChart2 size={20} color={colors.link} />
            </View>
            <Text style={styles.statValue}>
              {formatTokens(monthlyTotal.tokens)}
            </Text>
            <Text style={styles.statLabel}>Tokens</Text>
          </View>
        </View>

        {/* Budget Progress */}
        {monthlyTotal.budget > 0 && (
          <View style={styles.budgetContainer}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>Budget Used</Text>
              <Text style={styles.budgetPercent}>
                {monthlyTotal.percentUsed.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(monthlyTotal.percentUsed, 100)}%`,
                    backgroundColor:
                      monthlyTotal.percentUsed > 80
                        ? colors.error
                        : monthlyTotal.percentUsed > 50
                          ? "#f59e0b"
                          : colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.budgetAmount}>
              {formatCost(monthlyTotal.cost)} /{" "}
              {formatCost(monthlyTotal.budget)}
            </Text>
          </View>
        )}
      </View>

      {/* Daily Spend Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 14 Days</Text>
        <View style={styles.chartContainer}>
          {dailySpend.map((day, index) => (
            <View key={day.date} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${(day.cost / maxDailyCost) * 100}%`,
                    backgroundColor:
                      index === dailySpend.length - 1
                        ? colors.primary
                        : colors.muted,
                  },
                ]}
              />
              <Text style={styles.barLabel}>
                {formatDate(day.date).split(" ")[1]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Model Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Model (30 days)</Text>
        {modelBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>No usage data yet</Text>
        ) : (
          modelBreakdown.slice(0, 8).map((model, index) => (
            <View key={model.model} style={styles.modelRow}>
              <View
                style={[
                  styles.modelDot,
                  { backgroundColor: getModelColor(index) },
                ]}
              />
              <View style={styles.modelInfo}>
                <Text style={styles.modelName} numberOfLines={1}>
                  {model.model.split(":").pop()}
                </Text>
                <Text style={styles.modelMeta}>
                  {model.requests} requests · {formatTokens(model.tokens)}{" "}
                  tokens
                </Text>
              </View>
              <Text style={styles.modelCost}>{formatCost(model.cost)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  budgetContainer: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  budgetLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
  },
  budgetPercent: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  budgetAmount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "80%",
    minHeight: 4,
    borderRadius: radius.sm,
  },
  barLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
  },
  modelMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  modelCost: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.foreground,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
