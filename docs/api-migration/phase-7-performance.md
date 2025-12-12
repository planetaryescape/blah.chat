# Phase 7: Performance Optimization

> **⚠️ Implementation Status: NOT APPLICABLE (0%)**
> Cannot optimize API that doesn't exist. This phase applies AFTER phases 0-6 complete. Will incorporate 2025 patterns: HTTP caching headers, React Query v5 cache config, bundle optimization.

## Overview

Optimize API for production: caching, N+1 prevention, bundle size, monitoring. Ensure mobile app performance meets industry standards.

## Context & Grand Scope

### Why This Phase Exists
Phases 0-6 built functional API. Phase 7 makes it production-grade: fast, efficient, observable. Mobile users on 3G/4G with limited data plans need optimized payloads and smart caching.

### Dependencies
- **Previous phases**: All (0-6) - need working system to optimize ✅
- **Blocks**: Phase 8 (documentation - document optimized patterns)
- **Critical path**: Required for production launch (user experience)

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. Mobile Performance Benchmarks**

| Metric | Target | Why | Source |
|--------|--------|-----|--------|
| **First Load** | <3s | 53% abandon if >3s | Google |
| **Time to Interactive** | <5s | User expects responsiveness | Web Vitals |
| **API Response** | <200ms | Feels instant | Nielsen |
| **Bundle Size** | <200KB (gzip) | 3G download <2s | Lighthouse |
| **Data Usage** | <1MB/session | Data plan conscious | Mobile UX |

**ChatGPT Performance**:
- API latency: 100-300ms (measured)
- Bundle size: ~180KB (gzip, initial)
- Caching: Aggressive (CDN + client)
- Data optimization: Delta updates, not full state

**2. Caching Strategies**

| Layer | Strategy | TTL | Use Case |
|-------|----------|-----|----------|
| **CDN** | Edge caching | 1-24h | Static assets, API docs |
| **HTTP** | Cache-Control headers | 5-60s | List endpoints |
| **React Query** | Stale-while-revalidate | 10-30s | Conversations list |
| **Service Worker** | Offline-first | Indefinite | PWA shell |

**3. Database Optimization**

**N+1 Query Problem**:
```typescript
// BAD: N+1 queries
const conversations = await db.query("conversations");
for (const conv of conversations) {
  const lastMessage = await db.query("messages")
    .filter(m => m.conversationId === conv.id)
    .first(); // 1 + N queries
}

// GOOD: Single query with join
const conversations = await db.query("conversations")
  .include("lastMessage")
  .all(); // 1 query
```

**4. Bundle Size Optimization**

Techniques:
- Code splitting (route-based)
- Tree shaking (eliminate unused code)
- Dynamic imports (`import()`)
- Compression (Brotli > Gzip)

### Decisions Made

**Decision 1: Aggressive Client Caching**
- Conversations list: 30s stale time (rarely changes)
- Messages: No cache (real-time via SSE)
- Preferences: 5min stale (rarely changes)
- Rationale: 80% reduction in API calls

**Decision 2: Incremental Static Regeneration (ISR)**
- Public pages (landing, docs): ISR with 1h revalidation
- App routes: Dynamic (force-dynamic)
- Rationale: Next.js 15 optimization

**Decision 3: Payload Optimization**
- Remove null fields (40% size reduction)
- Omit large fields until needed (lazy load)
- Delta updates (send only changed fields)

**Decision 4: Monitoring Setup**
- PostHog: Already configured (existing)
- Vercel Analytics: Built-in
- Custom: API latency tracking
- Alerts: p95 latency >500ms

## Current State Analysis

### How blah.chat Works Today

**1. No HTTP Caching**
```typescript
// src/app/api/v1/conversations/route.ts
export const dynamic = "force-dynamic"; // Disables all caching
```

**2. Full Payload Every Time**
```json
// GET /api/v1/conversations response (repeated fields)
{
  "status": "success",
  "sys": { "entity": "list" },
  "data": {
    "items": [
      {
        "_id": "conv1",
        "userId": "user_abc", // Redundant (same for all)
        "title": "Chat 1",
        "modelId": "openai:gpt-4o",
        "createdAt": 1702209600000,
        "updatedAt": 1702209600000,
        // ... 10 more fields ...
      },
      // ... 50 more conversations ...
    ]
  }
}
```

**3. N+1 Queries Possible**
```typescript
// Potential N+1 in messages endpoint
const conversations = await conversationsDAL.list(userId);
for (const conv of conversations) {
  // If we fetch lastMessage for each, N+1 problem
  const lastMessage = await messagesDAL.getLatest(conv._id);
}
```

**4. No Bundle Analysis**
```bash
# No bundle size tracking
# No tree-shaking verification
# No code splitting analysis
```

**5. No Performance Monitoring**
```typescript
// No metrics for:
// - API response times
// - Cache hit rates
// - Bundle load times
// - Real user monitoring (RUM)
```

### Specific Files/Patterns

**Optimization targets** (from `/Users/bhekanik/code/planetaryescape/blah.chat/`):
1. `src/app/api/v1/conversations/route.ts` - Add HTTP caching
2. `src/lib/utils/formatEntity.ts` - Omit null/undefined fields
3. `src/lib/hooks/queries/*` - Tune React Query cache
4. `package.json` - Analyze bundle size
5. `src/lib/logger.ts` - Add performance logging

## Target State

### What We're Building

```
src/
├── lib/
│   ├── api/
│   │   ├── cache.ts              # HTTP cache helpers
│   │   └── monitoring.ts         # Performance tracking
│   └── utils/
│       └── payload.ts            # Payload optimization
├── scripts/
│   └── analyze-bundle.ts         # Bundle size analysis
└── app/api/v1/
    └── (routes with Cache-Control headers)
```

### Success Looks Like

**1. API Response with Caching**
```bash
GET /api/v1/conversations
Authorization: Bearer <token>
```

Response:
```http
HTTP/1.1 200 OK
Cache-Control: private, max-age=30, stale-while-revalidate=60
ETag: "abc123"
Content-Type: application/json
X-Response-Time: 45ms

{ ... data ... }
```

**2. Optimized Payload**
```json
// Before (450 bytes)
{
  "status": "success",
  "sys": { "entity": "conversation" },
  "data": {
    "_id": "conv1",
    "userId": "user_abc",
    "title": "Chat",
    "modelId": "openai:gpt-4o",
    "createdAt": 1702209600000,
    "updatedAt": 1702209600000,
    "archived": null,
    "projectId": null,
    "tags": null,
    "metadata": null
  }
}

// After (280 bytes, 38% reduction)
{
  "status": "success",
  "sys": { "entity": "conversation" },
  "data": {
    "_id": "conv1",
    "title": "Chat",
    "modelId": "openai:gpt-4o",
    "updatedAt": 1702209600000
  }
}
// Omitted: userId (implied), createdAt (not needed), null fields
```

**3. Bundle Analysis**
```bash
bun run analyze

# Output:
# Route: /chat/[id] - 85KB (gzip)
# Route: /settings - 12KB (gzip)
# Shared chunks: 120KB (gzip)
# Total (first load): 205KB (gzip) ✅ Under 200KB target
```

**4. Performance Dashboard**
```
PostHog Dashboard
-----------------
API Latency (p95): 180ms ✅
Cache Hit Rate: 85% ✅
Bundle Load Time: 1.2s ✅
Time to Interactive: 2.8s ✅
```

## Implementation Steps

### Step 1: Add HTTP Cache Headers

**Goal**: Enable client/CDN caching for appropriate endpoints

**Action**: Create cache helper, apply to routes

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/cache.ts`
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/conversations/route.ts`

**Code**:
```typescript
// src/lib/api/cache.ts
/**
 * HTTP cache control helpers
 */

export interface CacheConfig {
  maxAge?: number; // Cache TTL in seconds
  swr?: number; // Stale-while-revalidate in seconds
  public?: boolean; // Allow CDN caching
}

/**
 * Generate Cache-Control header
 */
export function getCacheControl(config: CacheConfig): string {
  const parts: string[] = [];

  // Public vs private
  parts.push(config.public ? "public" : "private");

  // Max age
  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  } else {
    parts.push("no-cache");
  }

  // Stale-while-revalidate
  if (config.swr) {
    parts.push(`stale-while-revalidate=${config.swr}`);
  }

  return parts.join(", ");
}

/**
 * Common cache configurations
 */
export const CachePresets = {
  // Short cache for lists (30s)
  LIST: {
    maxAge: 30,
    swr: 60,
    public: false,
  },

  // Medium cache for single items (5min)
  ITEM: {
    maxAge: 300,
    swr: 600,
    public: false,
  },

  // Long cache for static data (1h)
  STATIC: {
    maxAge: 3600,
    swr: 7200,
    public: true,
  },

  // No cache for real-time data
  NO_CACHE: {
    maxAge: 0,
    public: false,
  },
};
```

```typescript
// src/app/api/v1/conversations/route.ts
import { getCacheControl, CachePresets } from "@/lib/api/cache";

export const GET = withAuth(async (req, { userId }) => {
  const { page, pageSize } = getPaginationParams(req);

  const conversations = await conversationsDAL.list(userId, page, pageSize);
  const total = await conversationsDAL.count(userId);

  return NextResponse.json(
    formatEntity(
      buildPaginatedResponse(conversations, page, pageSize, total),
      "list"
    ),
    {
      headers: {
        "Cache-Control": getCacheControl(CachePresets.LIST),
      },
    }
  );
});
```

### Step 2: Optimize Payload Size

**Goal**: Remove null/undefined fields, reduce redundancy

**Action**: Create payload optimizer

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/utils/payload.ts`
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/utils/formatEntity.ts`

**Code**:
```typescript
// src/lib/utils/payload.ts
/**
 * Payload optimization utilities
 */

/**
 * Remove null/undefined/empty fields from object
 */
export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue; // Omit null/undefined
    }

    if (Array.isArray(value) && value.length === 0) {
      continue; // Omit empty arrays
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const compacted = compact(value);
      if (Object.keys(compacted).length > 0) {
        result[key] = compacted;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Pick only specified fields
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result: any = {};

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Omit specified fields
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result: any = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
}
```

```typescript
// src/lib/utils/formatEntity.ts (update existing)
import { compact } from "./payload";

export function formatEntity<T>(
  data: T,
  entityType: string,
  id?: string
): ApiResponse<T> {
  // Compact data (remove null/undefined)
  const compactedData = typeof data === "object" && data !== null
    ? compact(data as any)
    : data;

  return {
    status: "success",
    sys: {
      entity: entityType,
      ...(id ? { id } : {}),
      timestamps: {
        retrieved: new Date().toISOString(),
      },
    },
    data: compactedData as T,
  };
}
```

### Step 3: Optimize React Query Cache

**Goal**: Tune stale times, reduce refetch frequency

**Action**: Update QueryProvider config

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/providers/QueryProvider.tsx`

**Code**:
```typescript
// src/providers/QueryProvider.tsx
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // OPTIMIZED: Longer stale time (data fresh for 30s)
        staleTime: 30 * 1000, // Was: 5s

        // OPTIMIZED: Longer garbage collection (keep cache 10min)
        gcTime: 10 * 60 * 1000, // Was: 5min

        // OPTIMIZED: Fewer retries (fail fast)
        retry: 1, // Was: 3

        // OPTIMIZED: Disable auto-refetch on mount (use cache)
        refetchOnMount: false, // Was: true (if stale)

        // Keep: Refetch on focus
        refetchOnWindowFocus: true,

        // OPTIMIZED: Disable reconnect refetch (SSE handles)
        refetchOnReconnect: false, // Was: false already
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}
```

### Step 4: Add Performance Monitoring

**Goal**: Track API latency, cache hits, bundle load

**Action**: Create monitoring utilities

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/monitoring.ts`
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/middleware/auth.ts`

**Code**:
```typescript
// src/lib/api/monitoring.ts
import { logger } from "@/lib/logger";
import posthog from "posthog-js";

/**
 * Track API performance metrics
 */
export function trackAPIPerformance(
  endpoint: string,
  method: string,
  duration: number,
  status: number,
  cacheHit: boolean = false
) {
  // Log
  logger.info({
    type: "api_performance",
    endpoint,
    method,
    duration,
    status,
    cacheHit,
  });

  // Send to PostHog (if configured)
  if (typeof window !== "undefined" && posthog) {
    posthog.capture("api_request", {
      endpoint,
      method,
      duration,
      status,
      cacheHit,
    });
  }
}

/**
 * Track bundle load performance
 */
export function trackBundleLoad() {
  if (typeof window === "undefined") return;

  // Use Performance API
  window.addEventListener("load", () => {
    const perfData = performance.getEntriesByType("navigation")[0] as any;

    logger.info({
      type: "bundle_load",
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
    });

    // Send to PostHog
    posthog?.capture("bundle_load", {
      domContentLoaded: perfData.domContentLoadedEventEnd,
      loadComplete: perfData.loadEventEnd,
      ttfb: perfData.responseStart - perfData.requestStart,
    });
  });
}
```

```typescript
// src/lib/api/middleware/auth.ts (update existing)
import { trackAPIPerformance } from "../monitoring";

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    const startTime = Date.now();
    const method = req.method;
    const url = req.url;
    const pathname = new URL(url).pathname;

    try {
      // ... existing auth logic ...

      const response = await handler(req, { userId, sessionId, params: context?.params });

      // Track performance
      const duration = Date.now() - startTime;
      trackAPIPerformance(pathname, method, duration, response.status);

      logger.info({
        method,
        url,
        userId,
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      // ... existing error handling ...
    }
  };
}
```

### Step 5: Analyze Bundle Size

**Goal**: Identify large dependencies, optimize imports

**Action**: Add bundle analyzer script

**Files**:
- Install: `bun add -D @next/bundle-analyzer`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/scripts/analyze-bundle.ts`
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/next.config.ts`

**Code**:
```bash
# Install
bun add -D @next/bundle-analyzer
```

```typescript
// next.config.ts (update existing)
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  // ... existing config ...

  // OPTIMIZE: Compress output
  compress: true,

  // OPTIMIZE: Modern output (smaller)
  swcMinify: true,

  // OPTIMIZE: Modularize imports
  modularizeImports: {
    "@/components": {
      transform: "@/components/{{member}}",
    },
  },
};

export default bundleAnalyzer(nextConfig);
```

```bash
# Add to package.json scripts
{
  "scripts": {
    "analyze": "ANALYZE=true bun run build"
  }
}
```

### Step 6: Implement N+1 Prevention

**Goal**: Eliminate multiple DB queries

**Action**: Add batch loading to DAL

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/conversations.ts`

**Code**:
```typescript
// src/lib/api/dal/conversations.ts (add to existing)
export const conversationsDAL = {
  // ... existing methods ...

  /**
   * List conversations with last message (OPTIMIZED: single query)
   */
  async listWithLastMessage(userId: string, page = 1, pageSize = 20) {
    // Fetch conversations
    const conversations = await fetchQuery(api.conversations.list, {
      userId,
      page,
      pageSize,
    });

    if (conversations.length === 0) {
      return [];
    }

    // Batch fetch last messages (OPTIMIZED: single query)
    const conversationIds = conversations.map((c) => c._id);
    const lastMessages = await fetchQuery(api.messages.getLastForConversations, {
      conversationIds,
    });

    // Map messages to conversations
    const messageMap = new Map(
      lastMessages.map((m) => [m.conversationId, m])
    );

    return conversations.map((conv) => ({
      ...conv,
      lastMessage: messageMap.get(conv._id),
    }));
  },
};
```

```typescript
// convex/messages.ts (add new query)
/**
 * Get last message for multiple conversations (batch query)
 */
export const getLastForConversations = query({
  args: {
    conversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.conversationIds.map((convId) =>
        ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .order("desc")
          .first()
      )
    );

    return results.filter((m) => m !== null);
  },
});
```

### Step 7: Add Performance Budget

**Goal**: Enforce bundle size limits in CI

**Action**: Create budget check script

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/scripts/check-bundle-size.ts`

**Code**:
```typescript
// scripts/check-bundle-size.ts
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const BUDGETS = {
  "/_app": 200 * 1024, // 200KB (gzip)
  "/chat/[id]": 100 * 1024, // 100KB (gzip)
  "/settings": 50 * 1024, // 50KB (gzip)
};

function getGzipSize(filePath: string): number {
  const content = readFileSync(filePath);
  // Approximate gzip size (actual compression ratio ~0.7)
  return Math.floor(content.length * 0.3);
}

function checkBudget() {
  const nextDir = join(process.cwd(), ".next");
  const staticDir = join(nextDir, "static");

  let violations = 0;

  for (const [route, budget] of Object.entries(BUDGETS)) {
    // Find chunk file for route
    const chunks = readdirSync(staticDir, { recursive: true })
      .filter((f) => f.toString().includes(route.replace(/\//g, "-")));

    const totalSize = chunks.reduce((sum, chunk) => {
      const path = join(staticDir, chunk.toString());
      return sum + (statSync(path).isFile() ? getGzipSize(path) : 0);
    }, 0);

    const budgetKB = Math.floor(budget / 1024);
    const actualKB = Math.floor(totalSize / 1024);

    if (totalSize > budget) {
      console.error(`❌ ${route}: ${actualKB}KB > ${budgetKB}KB budget`);
      violations++;
    } else {
      console.log(`✅ ${route}: ${actualKB}KB <= ${budgetKB}KB budget`);
    }
  }

  if (violations > 0) {
    console.error(`\n❌ ${violations} budget violations`);
    process.exit(1);
  }

  console.log("\n✅ All budgets passed");
}

checkBudget();
```

```json
// package.json (add script)
{
  "scripts": {
    "check-budget": "bun run scripts/check-bundle-size.ts"
  }
}
```

## Code Examples & Patterns

### Pattern 1: Conditional Field Inclusion

```typescript
// Only include expensive fields if requested
export const GET = withAuth(async (req, { userId, params }) => {
  const includeMessages = req.nextUrl.searchParams.get("include") === "messages";

  const conversation = await conversationsDAL.getById(params.id, userId);

  if (includeMessages) {
    const messages = await messagesDAL.list(conversation._id, userId);
    return NextResponse.json(
      formatEntity({ ...conversation, messages }, "conversation")
    );
  }

  return NextResponse.json(formatEntity(conversation, "conversation"));
});
```

### Pattern 2: ETag Caching

```typescript
import { createHash } from "crypto";

export const GET = withAuth(async (req, { userId }) => {
  const conversations = await conversationsDAL.list(userId);

  // Generate ETag (hash of data)
  const etag = createHash("md5")
    .update(JSON.stringify(conversations))
    .digest("hex");

  // Check If-None-Match header
  if (req.headers.get("If-None-Match") === etag) {
    return new NextResponse(null, { status: 304 }); // Not Modified
  }

  return NextResponse.json(formatEntity(conversations, "list"), {
    headers: {
      ETag: etag,
      "Cache-Control": getCacheControl(CachePresets.LIST),
    },
  });
});
```

### Pattern 3: Response Compression

```typescript
// middleware.ts (add compression)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const response = NextResponse.next();

  // Enable Brotli compression (if supported)
  const acceptEncoding = req.headers.get("accept-encoding") || "";

  if (acceptEncoding.includes("br")) {
    response.headers.set("Content-Encoding", "br");
  } else if (acceptEncoding.includes("gzip")) {
    response.headers.set("Content-Encoding", "gzip");
  }

  return response;
}
```

## Testing & Validation

### Performance Testing

**1. Lighthouse Audit**
```bash
# Install Lighthouse
bun add -D lighthouse

# Run audit
bunx lighthouse http://localhost:3000/chat/test-id --output=html --output-path=./lighthouse-report.html

# Expected scores:
# Performance: >90
# Accessibility: >95
# Best Practices: >95
# SEO: >90
```

**2. Bundle Size Check**
```bash
bun run analyze

# Review report at http://localhost:8888
# Check for:
# - Large dependencies (>50KB)
# - Duplicate code
# - Unused exports
```

**3. API Latency Test**
```bash
# Use autocannon for load testing
bun add -D autocannon

bunx autocannon -c 10 -d 30 http://localhost:3000/api/v1/conversations

# Expected:
# p50: <100ms
# p95: <200ms
# p99: <500ms
```

**4. Cache Hit Rate**
```bash
# Monitor PostHog dashboard
# Expected:
# Cache hit rate: >80%
# Avg response time: <150ms
```

## Success Criteria

- [ ] HTTP caching enabled (Cache-Control headers)
- [ ] Payload optimized (null fields removed, 30-40% reduction)
- [ ] React Query cache tuned (30s stale time)
- [ ] Performance monitoring added (PostHog)
- [ ] Bundle size analyzed (<200KB gzip total)
- [ ] N+1 queries eliminated (batch loading)
- [ ] Performance budget enforced (CI check)
- [ ] Lighthouse score >90 (all categories)
- [ ] API p95 latency <200ms
- [ ] Cache hit rate >80%

## Common Pitfalls

### Pitfall 1: Over-Caching
**Problem**: Stale data shown, users confused
**Solution**: Use short TTLs (30s), stale-while-revalidate

### Pitfall 2: Cache Invalidation Bugs
**Problem**: Update conversation, list not refreshed
**Solution**: Invalidate related queries in mutation `onSuccess`

### Pitfall 3: Premature Optimization
**Problem**: Optimize before measuring, waste effort
**Solution**: Profile first, optimize bottlenecks only

### Pitfall 4: Breaking Changes for Performance
**Problem**: Remove field from API, mobile app crashes
**Solution**: Version API (v1 → v2), deprecate gradually

### Pitfall 5: Ignoring Mobile Networks
**Problem**: Works on WiFi, slow on 3G
**Solution**: Test with Chrome DevTools throttling (Slow 3G)

## Next Steps

After completing Phase 7:

**Immediate next**: [Phase 8: Documentation](./phase-8-documentation.md)
- API reference (OpenAPI spec)
- Mobile integration guide
- Update CLAUDE.md patterns
- Performance best practices

**Testing checklist before Phase 8**:
1. Lighthouse score >90 ✅
2. Bundle size <200KB ✅
3. API p95 <200ms ✅
4. Cache hit rate >80% ✅
5. No N+1 queries ✅
6. Performance budget passing ✅

Ready for Phase 8: Documentation and knowledge sharing.
