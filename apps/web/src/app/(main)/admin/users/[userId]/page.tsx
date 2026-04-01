"use client";

import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeft,
  Bookmark,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  Folder,
  Loader2,
  MessageSquare,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
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
import { ExportButton } from "@/components/admin/ExportButton";
import { UsageKPICard } from "@/components/admin/UsageKPICard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  type AdminActivityStats,
  type AdminCostByType,
  type AdminDailySpendRow,
  type AdminFeatureCostBreakdown,
  type AdminModelBreakdownRow,
  type AdminUsageSummary,
  type AdminUser,
  unwrapEntityList,
} from "../types";

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
  slides: "#f59e0b",
};

const FEATURE_COLORS: Record<string, string> = {
  chat: "#3b82f6",
  slides: "#f59e0b",
  notes: "#10b981",
  tasks: "#ec4899",
  files: "#8b5cf6",
  memory: "#6366f1",
  smart_assistant: "#14b8a6",
};

const FEATURE_LABELS: Record<string, string> = {
  chat: "Chat",
  slides: "Slides",
  notes: "Notes",
  tasks: "Tasks",
  files: "Files",
  memory: "Memory",
  smart_assistant: "Smart Assistant",
};

type PieLabelEntry = {
  name?: string;
  value?: number;
  model?: string;
  totalCost?: number;
};

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const unwrappedParams = use(params);
  const userId = unwrappedParams.userId;
  const router = useRouter();

  // Date range state - fresh last 30 days on each page load
  const [dateRange, setDateRange] = useState(() => getLastNDays(30));

  // TODO: Phase G - needs /api/v1/admin/users route
  const {
    data: user,
    isError: isUserError,
    error: userError,
  } = useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: async (): Promise<AdminUser | null> => {
      const res = await fetch(`/api/v1/admin/users/${userId}`);
      if (!res.ok) throw new Error(`Failed to fetch user (${res.status})`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  // TODO: Phase G - needs /api/v1/admin/users/:id/usage-summary route
  const { data: summary, isError: isSummaryError } = useQuery({
    queryKey: [
      "admin",
      "user-usage-summary",
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<AdminUsageSummary | null> => {
      const res = await fetch(
        `/api/v1/admin/users/${userId}/usage-summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      );
      if (!res.ok)
        throw new Error(`Failed to fetch usage summary (${res.status})`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  // TODO: Phase G - needs /api/v1/admin/users/:id/daily-spend route
  const { data: dailySpend, isError: isDailySpendError } = useQuery({
    queryKey: [
      "admin",
      "user-daily-spend",
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<AdminDailySpendRow[]> => {
      const res = await fetch(
        `/api/v1/admin/users/${userId}/daily-spend?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      );
      if (!res.ok)
        throw new Error(`Failed to fetch daily spend (${res.status})`);
      return unwrapEntityList<AdminDailySpendRow>(await res.json());
    },
  });

  // TODO: Phase G - needs /api/v1/admin/users/:id/spend-by-model route
  const { data: modelBreakdown, isError: isModelBreakdownError } = useQuery({
    queryKey: [
      "admin",
      "user-model-breakdown",
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<AdminModelBreakdownRow[]> => {
      const res = await fetch(
        `/api/v1/admin/users/${userId}/spend-by-model?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      );
      if (!res.ok)
        throw new Error(`Failed to fetch model breakdown (${res.status})`);
      return unwrapEntityList<AdminModelBreakdownRow>(await res.json());
    },
  });

  // TODO: Phase G - needs /api/v1/admin/users/:id/cost-by-type route
  const { data: costByType, isError: isCostByTypeError } = useQuery({
    queryKey: [
      "admin",
      "user-cost-by-type",
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<AdminCostByType | null> => {
      const res = await fetch(
        `/api/v1/admin/users/${userId}/cost-by-type?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      );
      if (!res.ok)
        throw new Error(`Failed to fetch cost by type (${res.status})`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  // TODO: Phase G - needs /api/v1/admin/users/:id/cost-by-feature route
  const { data: costByFeature, isError: isCostByFeatureError } = useQuery({
    queryKey: [
      "admin",
      "user-cost-by-feature",
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<AdminFeatureCostBreakdown | null> => {
      const res = await fetch(
        `/api/v1/admin/users/${userId}/cost-by-feature?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      );
      if (!res.ok)
        throw new Error(`Failed to fetch cost by feature (${res.status})`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  // TODO: Phase G - needs /api/v1/admin/users/:id/activity-stats route
  const { data: activityStats, isError: isActivityStatsError } = useQuery({
    queryKey: ["admin", "user-activity-stats", userId],
    queryFn: async (): Promise<AdminActivityStats | null> => {
      const res = await fetch(`/api/v1/admin/users/${userId}/activity-stats`);
      if (!res.ok)
        throw new Error(`Failed to fetch activity stats (${res.status})`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  // Virtualization setup - MUST be before early return to maintain hook order
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const shouldVirtualizeModels = (modelBreakdown?.length || 0) > 20;

  const rowVirtualizer = useVirtualizer({
    count: modelBreakdown?.length || 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 50,
    overscan: 5,
    enabled: shouldVirtualizeModels,
  });

  const hasError =
    isUserError ||
    isSummaryError ||
    isDailySpendError ||
    isModelBreakdownError ||
    isCostByTypeError ||
    isCostByFeatureError ||
    isActivityStatsError;

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-destructive font-medium">Failed to load user data</p>
        <p className="text-sm text-muted-foreground">
          {userError?.message || "One or more API requests failed."}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Early return check AFTER all hooks
  if (
    !user ||
    !summary ||
    !dailySpend ||
    !modelBreakdown ||
    !costByType ||
    !costByFeature ||
    !activityStats
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Feature breakdown data
  const featureData = Object.entries(costByFeature)
    .filter(([, data]) => data.total > 0)
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
    .sort((a, b) => b.value - a.value);

  // Prepare export data
  const exportData = modelBreakdown.map((model) => ({
    Model: model.model,
    "Total Cost": model.totalCost.toFixed(4),
    "Input Tokens": model.totalInputTokens,
    "Output Tokens": model.totalOutputTokens,
    "Total Tokens": model.totalInputTokens + model.totalOutputTokens,
    Requests: model.requestCount,
    "Avg Cost/Request": (model.totalCost / model.requestCount).toFixed(4),
  }));

  // Prepare cost type data for pie chart
  const costTypeData = [
    {
      name: "Text Generation",
      value: costByType.textGeneration.cost,
      color: COST_TYPE_COLORS.text,
    },
    {
      name: "Voice (STT/TTS)",
      value: costByType.tts.cost + costByType.transcription.cost,
      color: COST_TYPE_COLORS.voice,
    },
    {
      name: "Image Generation",
      value: costByType.images.cost,
      color: COST_TYPE_COLORS.images,
    },
    {
      name: "Slides",
      value: costByType.slides?.cost || 0,
      color: COST_TYPE_COLORS.slides,
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-background overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.imageUrl || undefined} alt={user.name} />
                <AvatarFallback>
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <ExportButton
              data={exportData}
              filename={`user-${userId}-usage-${dateRange.startDate}-${dateRange.endDate}`}
            />
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
          {/* Usage Stats KPI Cards (Date-filtered) */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Usage Statistics</h2>
            <div className="grid gap-4 md:grid-cols-5">
              <UsageKPICard
                label="Total Cost"
                value={formatCurrency(summary.totalCost)}
                icon={DollarSign}
              />
              <UsageKPICard
                label="Total Tokens"
                value={formatCompactNumber(summary.totalTokens)}
                icon={Zap}
              />
              <UsageKPICard
                label="Total Requests"
                value={summary.totalRequests}
                icon={TrendingUp}
              />
              <UsageKPICard
                label="Avg Cost/Request"
                value={formatCurrency(summary.avgCostPerRequest)}
                icon={DollarSign}
              />
              <UsageKPICard
                label="Messages Sent"
                value={summary.messageCount}
                icon={MessageSquare}
              />
            </div>
          </div>

          {/* Activity Stats KPI Cards (Global counts) */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Activity Overview</h2>
            <div className="grid gap-4 md:grid-cols-6">
              <UsageKPICard
                label="Notes"
                value={activityStats.notesCount}
                icon={FileText}
              />
              <UsageKPICard
                label="Projects"
                value={activityStats.projectsCount}
                icon={Folder}
              />
              <UsageKPICard
                label="Bookmarks"
                value={activityStats.bookmarksCount}
                icon={Bookmark}
              />
              <UsageKPICard
                label="Templates"
                value={activityStats.templatesCount}
                icon={Clock}
              />
              <UsageKPICard
                label="Tasks"
                value={activityStats.tasksCount}
                icon={CheckSquare}
              />
            </div>
          </div>

          {/* Daily Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity Log</CardTitle>
              <CardDescription>
                Per-day usage breakdown (no message content)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Messages</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Input Tokens</TableHead>
                      <TableHead className="text-right">
                        Output Tokens
                      </TableHead>
                      <TableHead className="text-right">Total Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySpend.length > 0 ? (
                      [...dailySpend]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((day) => (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium">
                              {day.date}
                            </TableCell>
                            <TableCell className="text-right">
                              {day.messageCount ?? 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {day.requestCount ?? 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCompactNumber(day.totalInputTokens ?? 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCompactNumber(day.totalOutputTokens ?? 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCompactNumber(day.totalTokens ?? 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(day.totalCost ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No activity in the selected date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Daily Spend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Spend Over Time</CardTitle>
              <CardDescription>
                Cost breakdown by day in the selected date range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailySpend}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency((value as number) ?? 0),
                      "Cost",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorCost)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Model Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Model Breakdown</CardTitle>
                <CardDescription>Cost distribution by model</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: PieLabelEntry) =>
                        `${(entry.model ?? "").split(":")[1] || entry.model || "Unknown"}: ${formatCurrency(entry.totalCost ?? 0)}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalCost"
                    >
                      {modelBreakdown.map((_entry, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        formatCurrency((value as number) ?? 0)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost by Feature Breakdown */}
            {featureData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Feature</CardTitle>
                  <CardDescription>
                    Distribution across product features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={featureData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: PieLabelEntry) =>
                          `${entry.name ?? "Unknown"}: ${formatCurrency(entry.value ?? 0)}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {featureData.map((entry) => (
                          <Cell
                            key={`cell-${entry.key}`}
                            fill={FEATURE_COLORS[entry.key] || COLORS[0]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          formatCurrency((value as number) ?? 0)
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
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
                          <span className="font-medium">{feature.name}</span>
                          <span className="ml-auto">
                            {formatCurrency(feature.value)}
                          </span>
                        </div>
                        <div className="ml-4 flex flex-wrap gap-x-3 gap-y-0.5">
                          {feature.breakdown.text > 0 && (
                            <span>
                              Text: {formatCurrency(feature.breakdown.text)}
                            </span>
                          )}
                          {feature.breakdown.tts > 0 && (
                            <span>
                              TTS: {formatCurrency(feature.breakdown.tts)}
                            </span>
                          )}
                          {feature.breakdown.stt > 0 && (
                            <span>
                              STT: {formatCurrency(feature.breakdown.stt)}
                            </span>
                          )}
                          {feature.breakdown.image > 0 && (
                            <span>
                              Image: {formatCurrency(feature.breakdown.image)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cost Type Breakdown */}
            {costTypeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Type</CardTitle>
                  <CardDescription>
                    Distribution across different service types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: PieLabelEntry) =>
                          `${entry.name ?? "Unknown"}: ${formatCurrency(entry.value ?? 0)}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {costTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          formatCurrency((value as number) ?? 0)
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Model Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Model Usage Details</CardTitle>
              <CardDescription>
                Detailed breakdown of usage by model
                {shouldVirtualizeModels && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Virtualized: {modelBreakdown.length} models)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shouldVirtualizeModels ? (
                /* Virtualized rendering for 20+ models */
                <div
                  ref={tableContainerRef}
                  className="overflow-auto relative border rounded-md"
                  style={{ height: "400px" }}
                >
                  {/* Table Header */}
                  <div className="sticky top-0 z-10 bg-background border-b">
                    <div className="grid grid-cols-6 gap-4 px-4 py-3 text-sm font-medium">
                      <div>Model</div>
                      <div className="text-right">Requests</div>
                      <div className="text-right">Input Tokens</div>
                      <div className="text-right">Output Tokens</div>
                      <div className="text-right">Total Cost</div>
                      <div className="text-right">Avg Cost/Req</div>
                    </div>
                  </div>
                  {/* Virtualized Table Body */}
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: "relative",
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const model = modelBreakdown[virtualRow.index];
                      return (
                        <div
                          key={model.model}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          className="grid grid-cols-6 gap-4 px-4 py-3 border-b absolute left-0 w-full bg-background"
                          style={{
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <div className="font-medium">{model.model}</div>
                          <div className="text-right">{model.requestCount}</div>
                          <div className="text-right">
                            {formatCompactNumber(model.totalInputTokens)}
                          </div>
                          <div className="text-right">
                            {formatCompactNumber(model.totalOutputTokens)}
                          </div>
                          <div className="text-right">
                            {formatCurrency(model.totalCost)}
                          </div>
                          <div className="text-right">
                            {formatCurrency(
                              model.totalCost / model.requestCount,
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Standard table rendering for < 20 models */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Input Tokens</TableHead>
                      <TableHead className="text-right">
                        Output Tokens
                      </TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Avg Cost/Req</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelBreakdown.map((model) => (
                      <TableRow key={model.model}>
                        <TableCell className="font-medium">
                          {model.model}
                        </TableCell>
                        <TableCell className="text-right">
                          {model.requestCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(model.totalInputTokens)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(model.totalOutputTokens)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(model.totalCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(model.totalCost / model.requestCount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
