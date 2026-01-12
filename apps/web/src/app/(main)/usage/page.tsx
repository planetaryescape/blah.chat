"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "convex/react";
import {
  ArrowUpDown,
  Bookmark,
  Calendar,
  CheckSquare,
  Copy,
  DollarSign,
  FileText,
  Flame,
  Folder,
  GitBranch,
  Image,
  Key,
  Loader2,
  MessageSquare,
  RotateCcw,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { UsageKPICard } from "@/components/admin/UsageKPICard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCompactNumber,
  formatCurrency,
  getLastNDays,
} from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#6366f1",
];

const COST_TYPE_COLORS = {
  text: "#3b82f6",
  voice: "#10b981",
  images: "#a855f7",
};

const FEATURE_COLORS: Record<string, string> = {
  chat: "#3b82f6",
  notes: "#10b981",
  tasks: "#ec4899",
  files: "#8b5cf6",
  memory: "#6366f1",
  smart_assistant: "#14b8a6",
};

const FEATURE_LABELS: Record<string, string> = {
  chat: "Chat",
  notes: "Notes",
  tasks: "Tasks",
  files: "Files",
  memory: "Memory",
  smart_assistant: "Smart Assistant",
};

function UsagePageContent() {
  const [dateRange, setDateRange] = useState(() => getLastNDays(30));

  // Fetch all user data
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const usageSummary = useQuery(api.usage.queries.getUsageSummary, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const dailySpend = useQuery(api.usage.queries.getDailySpend, { days: 30 });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const spendByModel = useQuery(api.usage.queries.getSpendByModelDetailed, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const costByType = useQuery(api.usage.queries.getCostByType, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const costByFeature = useQuery(api.usage.queries.getCostByFeature, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const activityStats = useQuery(api.usage.queries.getActivityStats);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const totalCounts = useQuery(api.usage.queries.getTotalCounts);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const streakStats = useQuery(api.usage.queries.getStreakStats);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const heatmapData = useQuery(api.usage.queries.getActivityHeatmap);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const percentileRanking = useQuery(api.usage.queries.getPercentileRanking);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const actionStats = useQuery(api.usage.queries.getActionStats);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const byokBreakdown = useQuery(api.usage.queries.getByokBreakdown, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const isLoading =
    usageSummary === undefined ||
    activityStats === undefined ||
    totalCounts === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground animate-pulse">
            Loading usage stats...
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const costTypeData = costByType
    ? [
        { name: "Text", value: costByType.textGeneration.cost },
        { name: "Voice", value: costByType.tts.cost },
        { name: "Images", value: costByType.images.cost },
      ].filter((d) => d.value > 0)
    : [];

  // Feature breakdown data
  const featureData = costByFeature
    ? Object.entries(costByFeature)
        .filter(([_, data]) => data.total > 0)
        .map(([feature, data]) => ({
          name: FEATURE_LABELS[feature] || feature,
          key: feature,
          value: data.total,
          breakdown: {
            text: data.text,
            tts: data.tts,
            stt: data.stt,
            image: data.image,
          },
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const modelPieData =
    spendByModel?.slice(0, 6).map((m) => ({
      name: m.model.split(":").pop() || m.model,
      value: m.totalCost,
    })) || [];

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Usage</h1>
              <p className="text-sm text-muted-foreground">
                Comprehensive statistics about your activity
              </p>
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <Accordion
            type="multiple"
            defaultValue={["usage", "activity", "charts", "streaks", "actions"]}
            className="space-y-4"
          >
            {/* Usage Statistics */}
            <AccordionItem value="usage" className="border rounded-lg px-4">
              <AccordionTrigger>Usage Statistics</AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <UsageKPICard
                    label="Total Cost"
                    value={formatCurrency(usageSummary?.totalCost ?? 0)}
                    icon={DollarSign}
                  />
                  <UsageKPICard
                    label="Total Tokens"
                    value={formatCompactNumber(usageSummary?.totalTokens ?? 0)}
                    icon={Zap}
                  />
                  <UsageKPICard
                    label="Requests"
                    value={formatCompactNumber(
                      usageSummary?.totalRequests ?? 0,
                    )}
                    icon={TrendingUp}
                  />
                  <UsageKPICard
                    label="Avg Cost/Request"
                    value={formatCurrency(usageSummary?.avgCostPerRequest ?? 0)}
                    icon={DollarSign}
                  />
                  <UsageKPICard
                    label="Messages"
                    value={formatCompactNumber(usageSummary?.messageCount ?? 0)}
                    icon={MessageSquare}
                  />
                </div>

                {/* Token breakdown */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">
                      Input Tokens
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCompactNumber(usageSummary?.totalInputTokens ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">
                      Output Tokens
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCompactNumber(
                        usageSummary?.totalOutputTokens ?? 0,
                      )}
                    </div>
                  </div>
                </div>

                {/* BYOK breakdown - only show if there's any BYOK usage */}
                {byokBreakdown && byokBreakdown.byok.requests > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Key className="h-4 w-4" />
                      API Key Usage Breakdown
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">
                          Platform Keys
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(byokBreakdown.platform.cost)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {byokBreakdown.platform.requests} requests •{" "}
                          {formatCompactNumber(byokBreakdown.platform.tokens)}{" "}
                          tokens
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 border-primary/30 bg-primary/5">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Key className="h-3 w-3" />
                          Your API Keys
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(byokBreakdown.byok.cost)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {byokBreakdown.byok.requests} requests •{" "}
                          {formatCompactNumber(byokBreakdown.byok.tokens)}{" "}
                          tokens
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Activity Overview */}
            <AccordionItem value="activity" className="border rounded-lg px-4">
              <AccordionTrigger>Activity Overview</AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <UsageKPICard
                    label="Conversations"
                    value={totalCounts?.conversationsCount ?? 0}
                    icon={MessageSquare}
                  />
                  <UsageKPICard
                    label="Notes"
                    value={activityStats?.notesCount ?? 0}
                    icon={FileText}
                  />
                  <UsageKPICard
                    label="Projects"
                    value={activityStats?.projectsCount ?? 0}
                    icon={Folder}
                  />
                  <UsageKPICard
                    label="Bookmarks"
                    value={activityStats?.bookmarksCount ?? 0}
                    icon={Bookmark}
                  />
                  <UsageKPICard
                    label="Tasks"
                    value={activityStats?.tasksCount ?? 0}
                    icon={CheckSquare}
                  />
                  <UsageKPICard
                    label="Files Uploaded"
                    value={totalCounts?.filesCount ?? 0}
                    icon={FileText}
                  />
                  <UsageKPICard
                    label="Images Generated"
                    value={totalCounts?.imagesGenerated ?? 0}
                    icon={Image}
                  />
                  <UsageKPICard
                    label="Templates"
                    value={activityStats?.templatesCount ?? 0}
                    icon={Calendar}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Streaks & Rankings */}
            <AccordionItem value="streaks" className="border rounded-lg px-4">
              <AccordionTrigger>Streaks & Rankings</AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Current Streak
                    </div>
                    <div className="text-3xl font-bold">
                      {streakStats?.currentStreak ?? 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        days
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Longest Streak
                    </div>
                    <div className="text-3xl font-bold">
                      {streakStats?.longestStreak ?? 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        days
                      </span>
                    </div>
                  </div>
                  {percentileRanking && (
                    <>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Overall Ranking
                        </div>
                        <div className="text-3xl font-bold">
                          Top {100 - percentileRanking.overallPercentile}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          of {percentileRanking.totalActiveUsers} active users
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground mb-2">
                          Top Model Rankings
                        </div>
                        <div className="space-y-1">
                          {percentileRanking.modelRankings
                            .slice(0, 3)
                            .map((m) => (
                              <div
                                key={m.model}
                                className="flex justify-between text-xs"
                              >
                                <span className="truncate max-w-[120px]">
                                  {m.model.split(":").pop()}
                                </span>
                                <span className="font-medium">
                                  Top {100 - m.percentile}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Activity Heatmap */}
                {heatmapData && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">
                      Activity (Last 52 Weeks)
                    </h4>
                    <ActivityHeatmap data={heatmapData} />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Action Usage */}
            <AccordionItem value="actions" className="border rounded-lg px-4">
              <AccordionTrigger>Action Button Usage</AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <Copy className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">
                        {actionStats?.copy_message ?? 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Messages Copied
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <Bookmark className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">
                        {actionStats?.bookmark_message ?? 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Bookmarks Created
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">
                        {actionStats?.save_as_note ?? 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Saved as Notes
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">
                        {actionStats?.branch_message ?? 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Branches Created
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <RotateCcw className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">
                        {actionStats?.regenerate_message ?? 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Regenerations
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Charts */}
            <AccordionItem value="charts" className="border rounded-lg px-4">
              <AccordionTrigger>Charts & Breakdown</AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-6">
                {/* Daily Spend Chart */}
                {dailySpend && dailySpend.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Daily Spend</h4>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailySpend}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(val) =>
                              new Date(val).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickFormatter={(val) => `$${val.toFixed(2)}`}
                          />
                          <Tooltip
                            formatter={(val) => [
                              `$${(val as number).toFixed(4)}`,
                              "Cost",
                            ]}
                            labelFormatter={(label) =>
                              new Date(label).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="cost"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Pie Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Model Breakdown */}
                  {modelPieData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">
                        Spend by Model
                      </h4>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={modelPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) =>
                                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                              }
                              labelLine={{ strokeWidth: 1 }}
                            >
                              {modelPieData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val) => [
                                `$${(val as number).toFixed(4)}`,
                                "Cost",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Cost by Feature */}
                  {featureData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">
                        Cost by Feature
                      </h4>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={featureData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) =>
                                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                              }
                              labelLine={{ strokeWidth: 1 }}
                            >
                              {featureData.map((entry) => (
                                <Cell
                                  key={`cell-${entry.key}`}
                                  fill={FEATURE_COLORS[entry.key] || COLORS[0]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val) => [
                                `$${(val as number).toFixed(4)}`,
                                "Cost",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Sub-breakdown */}
                      <div className="mt-4 space-y-2">
                        {featureData.map((feature) => (
                          <div
                            key={feature.key}
                            className="text-xs text-muted-foreground"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    FEATURE_COLORS[feature.key] || COLORS[0],
                                }}
                              />
                              <span className="font-medium">
                                {feature.name}
                              </span>
                              <span className="ml-auto">
                                ${feature.value.toFixed(4)}
                              </span>
                            </div>
                            <div className="ml-4 flex flex-wrap gap-x-3 gap-y-0.5">
                              {feature.breakdown.text > 0 && (
                                <span>
                                  Text: ${feature.breakdown.text.toFixed(4)}
                                </span>
                              )}
                              {feature.breakdown.tts > 0 && (
                                <span>
                                  TTS: ${feature.breakdown.tts.toFixed(4)}
                                </span>
                              )}
                              {feature.breakdown.stt > 0 && (
                                <span>
                                  STT: ${feature.breakdown.stt.toFixed(4)}
                                </span>
                              )}
                              {feature.breakdown.image > 0 && (
                                <span>
                                  Image: ${feature.breakdown.image.toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cost by Type */}
                  {costTypeData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Cost by Type</h4>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={costTypeData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) =>
                                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                              }
                              labelLine={{ strokeWidth: 1 }}
                            >
                              {costTypeData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    COST_TYPE_COLORS[
                                      entry.name.toLowerCase() as keyof typeof COST_TYPE_COLORS
                                    ] || COLORS[index]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val) => [
                                `$${(val as number).toFixed(4)}`,
                                "Cost",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Model Details Table */}
                {spendByModel && spendByModel.length > 0 && (
                  <ModelDetailsTable data={spendByModel} />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

// Activity Heatmap Component (GitHub-style)
function ActivityHeatmap({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  // Find max count for color scaling
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Get intensity level (0-4)
  const getIntensity = (count: number) => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  };

  const intensityColors = [
    "bg-muted", // 0 - no activity
    "bg-emerald-200 dark:bg-emerald-900", // 1
    "bg-emerald-400 dark:bg-emerald-700", // 2
    "bg-emerald-500 dark:bg-emerald-500", // 3
    "bg-emerald-600 dark:bg-emerald-400", // 4
  ];

  // Group by week (7 days per column)
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[2px] min-w-max">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] mr-1 pt-4">
          {dayLabels.map((day, i) => (
            <div
              key={i}
              className="h-[10px] w-[10px] text-[8px] text-muted-foreground flex items-center justify-center"
            >
              {i % 2 === 1 ? day : ""}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[2px]">
            {/* Month label on first week of month */}
            <div className="h-3 text-[8px] text-muted-foreground">
              {weekIndex === 0 ||
              (week[0] &&
                new Date(week[0].date).getDate() <= 7 &&
                weekIndex > 0)
                ? new Date(week[0]?.date || "").toLocaleDateString("en-US", {
                    month: "short",
                  })
                : ""}
            </div>
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`h-[10px] w-[10px] rounded-[2px] ${intensityColors[getIntensity(day.count)]}`}
                title={`${day.date}: ${day.count} messages`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {intensityColors.map((color, i) => (
          <div key={i} className={`h-[10px] w-[10px] rounded-[2px] ${color}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// Model Details Table Component (sortable)
interface ModelData {
  model: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
}

function ModelDetailsTable({ data }: { data: ModelData[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalCost", desc: true },
  ]);

  const columns: ColumnDef<ModelData>[] = useMemo(
    () => [
      {
        accessorKey: "model",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 hover:bg-transparent"
          >
            Model
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.model}</span>
        ),
      },
      {
        accessorKey: "requestCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent w-full justify-end"
          >
            Requests
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right">{row.original.requestCount}</div>
        ),
      },
      {
        accessorKey: "totalInputTokens",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent w-full justify-end"
          >
            Input Tokens
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatCompactNumber(row.original.totalInputTokens)}
          </div>
        ),
      },
      {
        accessorKey: "totalOutputTokens",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent w-full justify-end"
          >
            Output Tokens
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatCompactNumber(row.original.totalOutputTokens)}
          </div>
        ),
      },
      {
        accessorKey: "totalCost",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent w-full justify-end"
          >
            Cost
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatCurrency(row.original.totalCost)}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Model Details</h4>
      <ScrollArea className="h-[400px] border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

function UsageLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground animate-pulse">
          Loading usage stats...
        </p>
      </div>
    </div>
  );
}

export default function UsagePage() {
  return (
    <Suspense fallback={<UsageLoadingSkeleton />}>
      <UsagePageContent />
    </Suspense>
  );
}
