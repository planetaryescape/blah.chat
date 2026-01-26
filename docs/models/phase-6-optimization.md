# Phase 6: Performance & Analytics

**Estimated Time**: 2 days
**Prerequisites**: Phase 5 complete (static config removed)
**Depends On**: All model lookups working via DB only

## What This Phase Does

Adds search functionality, usage analytics, and verifies performance. Ensures the system is production-ready for long-term use.

## Why This Is Needed

- Need search for admin UI (40+ models hard to browse)
- Usage analytics help understand which models are popular
- Performance verification ensures no regressions
- Completes the model management system

## Architecture

```
Admin UI
    ↓ search query
Convex Query (search)
    ↓ filters by name/provider/status
Results

Chat/Generation
    ↓ trackUsage mutation
modelUsage table
    ↓
Analytics Dashboard
```

## Implementation

### Step 1: Add Search Query

**File**: `packages/backend/convex/models/queries.ts`

Add to existing file:

```typescript
export const search = query({
  args: {
    query: v.string(),
    status: v.optional(statusValidator),
    provider: v.optional(providerValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();
    const limit = args.limit ?? 20;

    // Get models with optional filters
    let query = ctx.db.query("models");

    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status!));
    }

    const models = await query.collect();

    // Filter by search term
    const filtered = models.filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm) ||
        m.description?.toLowerCase().includes(searchTerm) ||
        m.id.toLowerCase().includes(searchTerm) ||
        m.provider.toLowerCase().includes(searchTerm)
    );

    // Apply provider filter if specified
    const providerFiltered = args.provider
      ? filtered.filter((m) => m.provider === args.provider)
      : filtered;

    // Sort by relevance (exact matches first)
    const sorted = providerFiltered.sort((a, b) => {
      const aExact = a.id.toLowerCase() === searchTerm || a.name.toLowerCase() === searchTerm;
      const bExact = b.id.toLowerCase() === searchTerm || b.name.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.slice(0, limit);
  },
});
```

### Step 2: Add Usage Analytics Schema

**File**: `packages/backend/convex/schema/models.ts`

Add to existing schema:

```typescript
export const modelUsageTable = defineTable({
  modelId: v.string(),
  userId: v.id("users"),
  feature: v.union(
    v.literal("chat"),
    v.literal("image"),
    v.literal("comparison"),
    v.literal("auto-router")
  ),
  timestamp: v.number(),
  // Optional: track cost for analytics
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  cost: v.optional(v.number()),
})
  .index("by_model", ["modelId"])
  .index("by_user", ["userId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_model_timestamp", ["modelId", "timestamp"]);
```

**Update**: `packages/backend/convex/schema.ts`

```typescript
import { modelUsageTable } from "./schema/models";

// In schema definition:
modelUsage: modelUsageTable,
```

### Step 3: Add Analytics Mutations

**File**: `packages/backend/convex/models/analytics.ts`

```typescript
import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { getCurrentUser } from "../users";

/**
 * Track model usage for analytics
 * Called from generation.ts after successful generation
 */
export const trackUsage = internalMutation({
  args: {
    modelId: v.string(),
    userId: v.id("users"),
    feature: v.union(
      v.literal("chat"),
      v.literal("image"),
      v.literal("comparison"),
      v.literal("auto-router")
    ),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("modelUsage", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get usage statistics (admin only)
 */
export const getUsageStats = query({
  args: {
    modelId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    groupBy: v.optional(v.union(v.literal("model"), v.literal("day"), v.literal("feature"))),
  },
  handler: async (ctx, args) => {
    // Admin check
    const user = await getCurrentUser(ctx);
    if (user.isAdmin !== true) {
      throw new Error("Admin access required");
    }

    // Build query
    let query = ctx.db.query("modelUsage");

    // Filter by model
    if (args.modelId) {
      query = query.withIndex("by_model", (q) => q.eq("modelId", args.modelId!));
    }

    const usage = await query.collect();

    // Filter by date range
    let filtered = usage;
    if (args.startDate) {
      filtered = filtered.filter((u) => u.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((u) => u.timestamp <= args.endDate!);
    }

    // Group by specified dimension
    if (args.groupBy === "model") {
      return groupByModel(filtered);
    } else if (args.groupBy === "day") {
      return groupByDay(filtered);
    } else if (args.groupBy === "feature") {
      return groupByFeature(filtered);
    }

    // Default: group by model
    return groupByModel(filtered);
  },
});

function groupByModel(usage: any[]) {
  const grouped: Record<string, {
    total: number;
    chat: number;
    image: number;
    comparison: number;
    autoRouter: number;
    totalCost: number;
  }> = {};

  for (const record of usage) {
    if (!grouped[record.modelId]) {
      grouped[record.modelId] = {
        total: 0,
        chat: 0,
        image: 0,
        comparison: 0,
        autoRouter: 0,
        totalCost: 0,
      };
    }
    grouped[record.modelId].total++;
    grouped[record.modelId][featureKey(record.feature)]++;
    if (record.cost) {
      grouped[record.modelId].totalCost += record.cost;
    }
  }

  return Object.entries(grouped)
    .map(([modelId, stats]) => ({ modelId, ...stats }))
    .sort((a, b) => b.total - a.total);
}

function groupByDay(usage: any[]) {
  const grouped: Record<string, number> = {};

  for (const record of usage) {
    const day = new Date(record.timestamp).toISOString().split("T")[0];
    grouped[day] = (grouped[day] || 0) + 1;
  }

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function groupByFeature(usage: any[]) {
  const grouped: Record<string, number> = {};

  for (const record of usage) {
    grouped[record.feature] = (grouped[record.feature] || 0) + 1;
  }

  return Object.entries(grouped)
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count);
}

function featureKey(feature: string): "chat" | "image" | "comparison" | "autoRouter" {
  if (feature === "auto-router") return "autoRouter";
  return feature as any;
}

/**
 * Get top models (admin dashboard widget)
 */
export const getTopModels = query({
  args: {
    limit: v.optional(v.number()),
    days: v.optional(v.number()), // Last N days
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.isAdmin !== true) {
      throw new Error("Admin access required");
    }

    const limit = args.limit ?? 10;
    const days = args.days ?? 30;
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const usage = await ctx.db
      .query("modelUsage")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", startDate))
      .collect();

    const byModel = groupByModel(usage);
    return byModel.slice(0, limit);
  },
});
```

### Step 4: Integrate Usage Tracking

**File**: `packages/backend/convex/generation.ts`

Add after successful generation:

```typescript
import { internal } from "./_generated/api";

// After generation completes successfully:
await ctx.runMutation(internal.models.analytics.trackUsage, {
  modelId: selectedModel,
  userId: user._id,
  feature: isComparison ? "comparison" : isImage ? "image" : "chat",
  inputTokens: result.usage?.promptTokens,
  outputTokens: result.usage?.completionTokens,
  cost: calculatedCost,
});
```

### Step 5: Add Analytics UI Component

**File**: `apps/web/src/components/admin/ModelsAnalytics.tsx`

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function ModelsAnalytics() {
  const topModels = useQuery(api.models.analytics.getTopModels, { limit: 10, days: 30 });
  const byDay = useQuery(api.models.analytics.getUsageStats, { groupBy: "day" });
  const byFeature = useQuery(api.models.analytics.getUsageStats, { groupBy: "feature" });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="top">
        <TabsList>
          <TabsTrigger value="top">Top Models</TabsTrigger>
          <TabsTrigger value="daily">Daily Usage</TabsTrigger>
          <TabsTrigger value="features">By Feature</TabsTrigger>
        </TabsList>

        <TabsContent value="top" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Models (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {!topModels ? (
                <div>Loading...</div>
              ) : topModels.length === 0 ? (
                <div className="text-muted-foreground">No usage data yet</div>
              ) : (
                <div className="space-y-3">
                  {topModels.map((model, i) => (
                    <div key={model.modelId} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-6">{i + 1}.</span>
                        <span className="font-mono text-sm">{model.modelId}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{model.total} uses</Badge>
                        {model.totalCost > 0 && (
                          <span className="text-sm text-muted-foreground">
                            ${model.totalCost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {!byDay ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-2">
                  {byDay.slice(-14).map((day: any) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm">{day.date}</span>
                      <Badge variant="secondary">{day.count} requests</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              {!byFeature ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-3">
                  {byFeature.map((item: any) => (
                    <div key={item.feature} className="flex items-center justify-between">
                      <span className="capitalize">{item.feature}</span>
                      <Badge>{item.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Step 6: Add Analytics to Admin Page

**File**: `apps/web/src/app/(main)/admin/models/page.tsx`

Add analytics tab:

```typescript
import { ModelsAnalytics } from "@/components/admin/ModelsAnalytics";

// In the page component, add a tab for analytics:
<Tabs defaultValue="models">
  <TabsList>
    <TabsTrigger value="models">Models</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>

  <TabsContent value="models">
    {/* Existing models DataTable */}
  </TabsContent>

  <TabsContent value="analytics">
    <ModelsAnalytics />
  </TabsContent>
</Tabs>
```

### Step 7: Verify Indexes

**File**: `packages/backend/convex/schema/models.ts`

Ensure all indexes exist:

```typescript
export const modelsTable = defineTable({
  // ... fields
})
  .index("by_id", ["id"])
  .index("by_provider", ["provider"])
  .index("by_status", ["status"])
  .index("by_provider_status", ["provider", "status"])
  .index("by_updated", ["updatedAt"]);

export const modelHistoryTable = defineTable({
  // ... fields
})
  .index("by_model", ["modelId"])
  .index("by_model_version", ["modelId", "version"]);

export const modelUsageTable = defineTable({
  // ... fields
})
  .index("by_model", ["modelId"])
  .index("by_user", ["userId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_model_timestamp", ["modelId", "timestamp"]);
```

## Performance Benchmarks

### Target Metrics

| Operation | Target | Acceptable |
|-----------|--------|------------|
| `getById` | <10ms | <50ms |
| `list` (all models) | <50ms | <100ms |
| `search` | <50ms | <100ms |
| `getUsageStats` | <100ms | <200ms |

### How to Measure

```typescript
// Add timing to queries (dev only)
const start = performance.now();
const result = await getModelConfig("openai:gpt-5");
console.log(`getModelConfig: ${performance.now() - start}ms`);
```

### Convex Dashboard

Monitor in Convex dashboard:
- Function execution times
- Database read/write counts
- Index usage

## Validation Checklist

- [ ] Search query returns relevant results
- [ ] Search filters by status and provider
- [ ] Usage tracking records generations
- [ ] Analytics dashboard shows top models
- [ ] Analytics shows daily usage trend
- [ ] Analytics shows feature breakdown
- [ ] All indexes verified in schema
- [ ] Performance meets targets (<50ms for most queries)

## Troubleshooting

### Search Returns No Results

**Check**:
1. Search term not empty
2. Models exist with matching name/id/description
3. Status filter not excluding all models

### Analytics Not Recording

**Check**:
1. `trackUsage` mutation called in generation.ts
2. User ID passed correctly
3. No errors in Convex function logs

### Slow Query Performance

**Check**:
1. Indexes exist and match query patterns
2. No full table scans (check Convex dashboard)
3. Result set not too large (add pagination)

## What Comes Next

**Part 1 Complete!** Model management system fully operational:
- ✅ Phase 1: Schema + seed
- ✅ Phase 2: Repository + queries
- ✅ Phase 3: Admin UI
- ✅ Phase 4: Gradual rollout
- ✅ Phase 5: Remove static config
- ✅ Phase 6: Optimization + analytics

**Part 2** covers auto-router configuration:
- Phase 7: Auto-router admin UI
- Phase 8: Wire auto-router to DB

Proceed to **[phase-7-autorouter-admin-ui.md](./phase-7-autorouter-admin-ui.md)**.

---

**Phase 6 Complete!** Model management fully operational with search and analytics.
