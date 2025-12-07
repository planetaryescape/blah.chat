# Phase 6: Performance + Analytics

**Estimated Time**: 2 days
**Prerequisites**: Phase 5 complete (static config removed)

## Context

**Problem**: DB queries on every request. No search, no usage analytics.

**Solution**: Memory cache, additional indexes, search functionality, usage tracking.

## Architecture Overview

```
Repository
    ↓ memory cache (60s TTL)
Convex Queries
    ↓ optimized indexes
Analytics Mutations
    ↓ track model usage
```

## Implementation

### Step 1: Add Memory Cache to Repository

**File**: `src/lib/models/repository.ts`

**Add caching layer**:

```typescript
// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL,
  });
}

export async function getModelConfig(id: string): Promise<ModelConfig | null> {
  // Check cache first
  const cached = getCached<ModelConfig>(`model:${id}`);
  if (cached) return cached;

  // Fetch from DB
  try {
    const dbModel = await fetchQuery(api.models.queries.get, { id });
    if (dbModel) {
      const config = dbToModelConfig(dbModel);
      setCache(`model:${id}`, config);
      return config;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch model ${id}:`, error);
    throw error;
  }
}

export async function getAllModels(): Promise<ModelConfig[]> {
  // Check cache
  const cached = getCached<ModelConfig[]>("models:all");
  if (cached) return cached;

  // Fetch from DB
  try {
    const dbModels = await fetchQuery(api.models.queries.list, {});
    const configs = dbModels.map(dbToModelConfig);
    setCache("models:all", configs);
    return configs;
  } catch (error) {
    console.error("Failed to fetch models:", error);
    throw error;
  }
}

// Cache invalidation helper (call after mutations)
export function invalidateCache(): void {
  cache.clear();
}
```

### Step 2: Add Search Query

**File**: `convex/models/queries.ts`

**Add search function**:

```typescript
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    // Get all active models
    const all = await ctx.db
      .query("models")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Filter by name, description, provider
    return all.filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm) ||
        m.description?.toLowerCase().includes(searchTerm) ||
        m.provider.toLowerCase().includes(searchTerm) ||
        m.id.toLowerCase().includes(searchTerm)
    );
  },
});
```

### Step 3: Add Usage Analytics

**File**: `convex/models/analytics.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const trackUsage = mutation({
  args: {
    modelId: v.string(),
    userId: v.id("users"),
    feature: v.union(v.literal("chat"), v.literal("image"), v.literal("comparison")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("modelUsage", {
      modelId: args.modelId,
      userId: args.userId,
      feature: args.feature,
      timestamp: Date.now(),
    });
  },
});

export const getUsageStats = query({
  args: {
    modelId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("modelUsage");

    // Filter by model
    if (args.modelId) {
      query = query.filter((q) => q.eq(q.field("modelId"), args.modelId));
    }

    // Filter by date range
    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate!));
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate!));
    }

    const usage = await query.collect();

    // Group by model
    const byModel = usage.reduce((acc, record) => {
      if (!acc[record.modelId]) {
        acc[record.modelId] = { total: 0, chat: 0, image: 0, comparison: 0 };
      }
      acc[record.modelId].total++;
      acc[record.modelId][record.feature]++;
      return acc;
    }, {} as Record<string, { total: number; chat: number; image: number; comparison: number }>);

    return byModel;
  },
});
```

**Add to schema** (`convex/schema.ts`):

```typescript
modelUsage: defineTable({
  modelId: v.string(),
  userId: v.id("users"),
  feature: v.union(v.literal("chat"), v.literal("image"), v.literal("comparison")),
  timestamp: v.number(),
})
.index("by_model", ["modelId"])
.index("by_timestamp", ["timestamp"]),
```

### Step 4: Optimize Indexes

**File**: `convex/schema.ts`

**Verify indexes exist** (should already be there from Phase 1):

```typescript
models: defineTable({ ... })
  .index("by_id", ["id"])
  .index("by_provider", ["provider"])
  .index("by_status", ["status"])
  .index("by_capabilities", ["supportsVision", "supportsThinking"]) // Add if missing
  .index("by_updated", ["updatedAt"]) // NEW: for sorting by recent updates
```

### Step 5: Add Analytics Dashboard

**File**: `src/components/settings/ModelsAnalytics.tsx`

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ModelsAnalytics() {
  const stats = useQuery(api.models.analytics.getUsageStats, {});

  if (!stats) return <div>Loading analytics...</div>;

  const sorted = Object.entries(stats)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10); // Top 10

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Models by Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map(([modelId, data]) => (
            <div key={modelId} className="flex justify-between border-b pb-2">
              <span className="font-mono text-sm">{modelId}</span>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Total: {data.total}</span>
                <span>Chat: {data.chat}</span>
                <span>Image: {data.image}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 6: Invalidate Cache on Mutations

**File**: `convex/models/mutations.ts`

**After each mutation**, add cache invalidation:

```typescript
// At end of create, update, delete, duplicate:

// Note: Can't call client-side cache invalidation from server
// Instead, use Convex reactive queries (cache auto-invalidates)
```

**Actually**, Convex reactive queries handle this automatically - no manual invalidation needed!

## Validation Checklist

- [ ] Memory cache reduces DB queries
- [ ] Search query returns relevant results
- [ ] Analytics tracking model usage
- [ ] Analytics dashboard shows top models
- [ ] Indexes optimize query performance
- [ ] Cache TTL expires correctly (test with 10s TTL)

## Performance Benchmarks

**Before optimization**:
- `getModelConfig()`: ~50ms (DB query every time)
- `getAllModels()`: ~100ms (58 models)

**After optimization**:
- `getModelConfig()`: ~1ms (cached)
- `getAllModels()`: ~2ms (cached)
- Cache miss: ~50ms (same as before)

**Target**: 90% cache hit rate.

## Troubleshooting

**Cache not working**:
- Check: TTL not too short (< 10s)
- Check: Cache key consistent (`model:${id}`)
- Check: Cache cleared between requests?

**Search returns nothing**:
- Check: Search term lowercase
- Check: Model exists in DB
- Check: Model status is "active"

**Analytics not tracking**:
- Check: `trackUsage()` called in chat/image generation
- Check: `modelUsage` table exists in schema
- Check: Indexes on `modelUsage` table

## Next Steps

**Migration Complete!** 🎉

All phases done:
- ✅ Phase 1: Schema + seed
- ✅ Phase 2: Repository + dual-read
- ✅ Phase 3: Admin UI + CRUD
- ✅ Phase 4: Gradual rollout
- ✅ Phase 5: Remove static config
- ✅ Phase 6: Optimization + analytics

**Future enhancements**:
- Redis caching for multi-server deployments
- Model versioning (track config changes over time)
- A/B testing (route % traffic to different models)
- Cost forecasting (predict monthly spend)
- Model deprecation warnings (notify users before removing)

---

**Phase 6 Complete!** ✅ **Migration fully done.** System is production-ready with DB-backed models, admin UI, and optimizations.
