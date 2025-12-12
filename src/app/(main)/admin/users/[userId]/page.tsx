"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, use, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeft,
  DollarSign,
  Zap,
  MessageSquare,
  TrendingUp,
  FileText,
  Folder,
  Bookmark,
  Clock,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { UsageKPICard } from "@/components/admin/UsageKPICard";
import { ExportButton } from "@/components/admin/ExportButton";
import {
  getLastNDays,
  formatCurrency,
  formatCompactNumber,
} from "@/lib/utils/date";

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

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: Id<"users"> }>;
}) {
  const unwrappedParams = use(params);
  const userId = unwrappedParams.userId;
  const router = useRouter();

  // Date range state with localStorage persistence
  const [dateRange, setDateRange] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin-user-detail-date-range");
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return getLastNDays(30);
  });

  // Persist date range to localStorage
  useEffect(() => {
    localStorage.setItem(
      "admin-user-detail-date-range",
      JSON.stringify(dateRange),
    );
  }, [dateRange]);

  // Fetch all data
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const users = useQuery(api.admin.listUsers);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const summary = useQuery(api.usage.queries.getUserUsageSummary, {
    userId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const dailySpend = useQuery(api.usage.queries.getUserDailySpend, {
    userId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const modelBreakdown = useQuery(api.usage.queries.getUserSpendByModel, {
    userId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const costByType = useQuery(api.usage.queries.getUserCostByType, {
    userId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const activityStats = useQuery(api.usage.queries.getUserActivityStats, {
    userId,
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

  const user = users?.find((u) => u._id === userId);

  // Early return check AFTER all hooks
  if (
    !user ||
    !summary ||
    !dailySpend ||
    !modelBreakdown ||
    !costByType ||
    !activityStats
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
  ].filter((item) => item.value > 0);

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
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
            <div className="grid gap-4 md:grid-cols-4">
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
            </div>
          </div>

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
                    formatter={(value: number) => [
                      formatCurrency(value),
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
                      label={(entry: any) =>
                        `${entry.model.split(":")[1] || entry.model}: ${formatCurrency(entry.totalCost)}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalCost"
                    >
                      {modelBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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
                        label={(entry: any) =>
                          `${entry.name}: ${formatCurrency(entry.value)}`
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
                        formatter={(value: number) => formatCurrency(value)}
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
