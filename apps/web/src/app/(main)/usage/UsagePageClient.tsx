"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  Calendar,
  CheckSquare,
  DollarSign,
  FileText,
  Flame,
  Folder,
  Image,
  Key,
  Loader2,
  MessageSquare,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Suspense, useState } from "react";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { UsageKPICard } from "@/components/admin/UsageKPICard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityHeatmap } from "@/components/usage/ActivityHeatmap";
import { UsageLoadingSkeleton } from "@/components/usage/UsageLoadingSkeleton";
import { useUserPreference } from "@/hooks/useUserPreference";
import {
  formatCompactNumber,
  formatCurrency,
  getLastNDays,
} from "@/lib/utils/date";
import { ActionUsageSection } from "./_components/ActionUsageSection";
import { UsageChartsSection } from "./_components/UsageChartsSection";

export const dynamic = "force-dynamic";

const FEATURE_LABELS = new Map<string, string>([
  ["chat", "Chat"],
  ["notes", "Notes"],
  ["tasks", "Tasks"],
  ["files", "Files"],
  ["memory", "Memory"],
  ["smart_assistant", "Smart Assistant"],
]);

interface FeatureCostBucket {
  total: number;
  text: number;
  tts: number;
  stt: number;
  image: number;
}

interface ModelSpend {
  model: string;
  totalCost: number;
}

function buildFeatureData(costByFeature: Record<string, FeatureCostBucket>): {
  name: string;
  key: string;
  value: number;
  breakdown: { text: number; tts: number; stt: number; image: number };
}[] {
  return Object.entries(costByFeature)
    .filter(([, data]) => data.total > 0)
    .map(([feature, data]) => ({
      name: FEATURE_LABELS.get(feature) ?? feature,
      key: feature,
      value: data.total,
      breakdown: {
        text: data.text,
        tts: data.tts,
        stt: data.stt,
        image: data.image,
      },
    }))
    .sort((a, b) => b.value - a.value);
}

function buildModelPieData(
  spendByModel: ModelSpend[],
): { name: string; value: number }[] {
  return spendByModel.map((m) => ({
    name: m.model.split(":").pop() ?? m.model,
    value: m.totalCost,
  }));
}

function UsagePageContent() {
  const [dateRange, setDateRange] = useState(() => getLastNDays(30));
  const showTasks = useUserPreference("showTasks");

  // TODO: Phase G - needs /api/v1/usage/* REST routes
  const fetchUsage = async (path: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    const res = await fetch(`/api/v1/usage/${path}${qs}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  };

  const dp = { startDate: dateRange.startDate, endDate: dateRange.endDate };
  const { data: usageSummary } = useQuery({
    queryKey: ["usage", "summary", dp],
    queryFn: () => fetchUsage("summary", dp),
  });
  const { data: dailySpend } = useQuery({
    queryKey: ["usage", "daily-spend"],
    queryFn: () => fetchUsage("daily-spend", { days: "30" }),
  });
  const { data: spendByModel } = useQuery({
    queryKey: ["usage", "spend-by-model", dp],
    queryFn: () => fetchUsage("spend-by-model-detailed", dp),
  });
  const { data: costByType } = useQuery({
    queryKey: ["usage", "cost-by-type", dp],
    queryFn: () => fetchUsage("cost-by-type", dp),
  });
  const { data: costByFeature } = useQuery({
    queryKey: ["usage", "cost-by-feature", dp],
    queryFn: () => fetchUsage("cost-by-feature", dp),
  });
  const { data: activityStats } = useQuery({
    queryKey: ["usage", "activity-stats"],
    queryFn: () => fetchUsage("activity-stats"),
  });
  const { data: totalCounts } = useQuery({
    queryKey: ["usage", "total-counts"],
    queryFn: () => fetchUsage("total-counts"),
  });
  const { data: streakStats } = useQuery({
    queryKey: ["usage", "streaks"],
    queryFn: () => fetchUsage("streaks"),
  });
  const { data: heatmapData } = useQuery({
    queryKey: ["usage", "heatmap"],
    queryFn: () => fetchUsage("heatmap"),
  });
  const { data: percentileRanking } = useQuery({
    queryKey: ["usage", "percentile"],
    queryFn: () => fetchUsage("percentile-ranking"),
  });
  const { data: actionStats } = useQuery({
    queryKey: ["usage", "action-stats"],
    queryFn: () => fetchUsage("action-stats"),
  });
  const { data: byokBreakdown } = useQuery({
    queryKey: ["usage", "byok-breakdown", dp],
    queryFn: () => fetchUsage("byok-breakdown", dp),
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
  const featureData = costByFeature ? buildFeatureData(costByFeature) : [];

  const modelPieData = spendByModel
    ? buildModelPieData(spendByModel.slice(0, 6))
    : [];

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
                  {showTasks && (
                    <UsageKPICard
                      label="Tasks"
                      value={activityStats?.tasksCount ?? 0}
                      icon={CheckSquare}
                    />
                  )}
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
                            .map((m: { model: string; percentile: number }) => (
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

            <ActionUsageSection actionStats={actionStats} />

            <UsageChartsSection
              dailySpend={dailySpend}
              modelPieData={modelPieData}
              featureData={featureData}
              costTypeData={costTypeData}
              spendByModel={spendByModel}
            />
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function UsagePageClient() {
  return (
    <Suspense fallback={<UsageLoadingSkeleton />}>
      <UsagePageContent />
    </Suspense>
  );
}
