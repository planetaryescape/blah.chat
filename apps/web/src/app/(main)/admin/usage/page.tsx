"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  DollarSign,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLastNDays } from "@/lib/utils/date";

const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#6366f1",
];

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

import { ScrollArea } from "@/components/ui/scroll-area";

export default function UsagePage() {
  const [dateRange, setDateRange] = useState(() => getLastNDays(30));

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const monthlyTotal = useQuery(api.usage.queries.getAllUsersMonthlyTotal);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const dailySpend = useQuery(api.usage.queries.getAllUsersDailySpend, {
    days: 30,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const spendByModel = useQuery(api.usage.queries.getAllUsersSpendByModel, {
    days: 30,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversationCosts = useQuery(
    api.usage.queries.getAllUsersConversationCosts,
    {
      limit: 10,
    },
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const userCount = useQuery(api.admin.getUserCount);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const costByFeature = useQuery(api.usage.queries.getAllUsersCostByFeature, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (
    !monthlyTotal ||
    !dailySpend ||
    !spendByModel ||
    !conversationCosts ||
    userCount === undefined
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const avgCostPerUser = userCount > 0 ? monthlyTotal.cost / userCount : 0;

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

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Usage & Costs
              </h1>
              <p className="text-muted-foreground">
                Track AI usage, costs, and budget across all users
              </p>
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
        {/* Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Spend
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${monthlyTotal.cost.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyTotal.budget > 0
                    ? `${monthlyTotal.percentUsed.toFixed(1)}% of $${monthlyTotal.budget} budget`
                    : "No budget set"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tokens
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(monthlyTotal.tokens / 1000).toFixed(1)}K
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monthlyTotal.requests}
                </div>
                <p className="text-xs text-muted-foreground">
                  API calls this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Cost/Request
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {monthlyTotal.requests > 0
                    ? (monthlyTotal.cost / monthlyTotal.requests).toFixed(4)
                    : "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">Per API call</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Cost/User
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${avgCostPerUser.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {userCount} total users
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Daily Spend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Spend</CardTitle>
                <CardDescription>
                  Cost per day over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailySpend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) =>
                        new Date(val).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis tickFormatter={(val) => `$${val.toFixed(2)}`} />
                    <Tooltip
                      formatter={(value) => [
                        `$${(value as number)?.toFixed(4) ?? "0"}`,
                        "Cost",
                      ]}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString()
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Daily Cost"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Spend by Model Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Spend by Model</CardTitle>
                <CardDescription>
                  Cost breakdown by AI model (last 30 days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendByModel}
                      dataKey="cost"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry: any) =>
                        `${entry.model}: $${entry.cost.toFixed(2)}`
                      }
                    >
                      {spendByModel.map((_entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        `$${(value as number)?.toFixed(4) ?? "0"}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cost by Feature */}
          {featureData.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Cost by Feature</CardTitle>
                <CardDescription>
                  Cost breakdown by product feature (all users)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={featureData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
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
                  {/* Sub-breakdown */}
                  <div className="space-y-3">
                    {featureData.map((feature) => (
                      <div key={feature.key} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                FEATURE_COLORS[feature.key] || COLORS[0],
                            }}
                          />
                          <span className="font-medium">{feature.name}</span>
                          <span className="ml-auto font-mono">
                            ${feature.value.toFixed(4)}
                          </span>
                        </div>
                        <div className="ml-5 text-xs text-muted-foreground flex flex-wrap gap-x-4">
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
              </CardContent>
            </Card>
          )}

          {/* Top Conversations by Cost */}
          <Card>
            <CardHeader>
              <CardTitle>Top Conversations by Cost</CardTitle>
              <CardDescription>
                Most expensive conversations (last 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversationCosts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="title"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(val) => `$${val.toFixed(2)}`} />
                  <Tooltip
                    formatter={(value) => [
                      `$${(value as number)?.toFixed(4) ?? "0"}`,
                      "Cost",
                    ]}
                    labelFormatter={(label) => `Conversation: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="cost" fill="#ec4899" name="Total Cost" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
