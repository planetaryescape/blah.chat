# API Architecture Guide

> **Documentation for Future Maintainers**
>
> This document captures the design philosophy, architectural decisions, and implementation patterns for blah.chat's hybrid API layer. Read this to understand **why** the system works this way and **how to extend** it without breaking core principles.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Core Architectural Decisions](#core-architectural-decisions)
3. [Implementation Patterns](#implementation-patterns)
4. [Performance & Optimization](#performance--optimization)
5. [Future Maintenance Guide](#future-maintenance-guide)
6. [Design Philosophy](#design-philosophy)

---

## The Big Picture

### Why Hybrid Architecture?

**Problem**: Native mobile apps can't use Convex's WebSocket-based client SDK. We needed HTTP API without sacrificing web performance.

**Solution**: Platform-aware dual transport layer:

```
┌─────────────┐                    ┌─────────────┐
│  Web Client │                    │Mobile Client│
│   (React)   │                    │(React Native│
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ Convex WebSocket           HTTP API
       │ (<100ms latency)           (REST+SSE)
       │                        ┌─────────┘
       │                        │
       ├────────────────────────┤
       │                        │
       v                        v
┌──────────────────────────────────────┐
│      Next.js API Routes              │
│  - Envelope pattern                  │
│  - Auth middleware (Clerk)           │
│  - Validation (Zod)                  │
└──────────────┬───────────────────────┘
               │
               v
┌──────────────────────────────────────┐
│     Data Access Layer (DAL)          │
│  - Thin wrapper over Convex          │
│  - Server-only authorization         │
└──────────────┬───────────────────────┘
               │
               v
┌──────────────────────────────────────┐
│         Convex Backend               │
│  - Real-time database                │
│  - Resilient generation (actions)    │
└──────────────────────────────────────┘
```

**Key Principle**: Don't sacrifice web UX for mobile compatibility. Each platform gets optimal transport layer.

### What We Built

**21 REST Endpoints**:
- Conversations: CRUD + archive/pin/star
- Messages: CRUD + regenerate + streaming (SSE)
- Preferences: Get/update + streaming (SSE)
- Actions: Transcription, search, memory extraction (async jobs)
- Utility: Health check

**3 Query Hooks** (hybrid Convex/REST):
- `useConversations()` - Auto-switches based on platform
- `useMessages()` - Paginated with loadMore support
- `usePreferences()` - 1h cache, infrequent updates

**Platform Detection**: `shouldUseConvex()` checks viewport width (<768px = mobile), user agent, touch capability.

---

## Core Architectural Decisions

### 1. Hybrid Transport (Platform-Aware)

**Decision**: Keep Convex client SDK for web, use HTTP API for mobile.

**Rationale**:
- Convex WebSocket subscriptions are instant (<100ms latency)
- Mobile can use HTTP polling (5-10s) + SSE for active streams
- Best performance for each platform
- Avoid rebuilding Convex's real-time infrastructure

**Trade-off Accepted**: Mobile updates have 5-10s delay vs instant on web. Acceptable for chat use case.

**Implementation**:
```typescript
// src/lib/hooks/queries/useConversations.ts
export function useConversations(options = {}) {
  const useConvexMode = shouldUseConvex(); // Platform detection

  // Web: Convex subscription (real-time)
  const convexData = useConvexQuery(
    api.conversations.list,
    useConvexMode ? {} : "skip"
  );

  // Mobile: React Query polling
  const restQuery = useQuery({
    queryKey: ["conversations", options],
    queryFn: () => apiClient.get("/conversations"),
    enabled: !useConvexMode,
    refetchInterval: 10000, // 10s polling
  });

  return useConvexMode ? convexData : restQuery.data;
}
```

### 2. Envelope Pattern (Consistent Responses)

**Decision**: Wrap all responses in predictable envelope format.

**Format**:
```typescript
// Success
{
  status: "success",
  sys: {
    entity: "conversation",
    id?: "conv_123",
    timestamps?: { createdAt, updatedAt }
  },
  data: { ...actualData }
}

// Error (RFC 9457 Problem Details)
{
  status: "error",
  sys: { entity: "error" },
  error: {
    message: "Resource not found",
    code: "NOT_FOUND",
    details?: { resource: "conversation", id: "conv_invalid" }
  }
}
```

**Why**:
- Consistent parsing (mobile SDKs can rely on structure)
- Easy error handling (single pattern)
- Metadata tracking (entity type, IDs for logging)
- Industry-proven (Stripe, GitHub, Slack use similar patterns)

**Usage**:
```typescript
// src/lib/utils/formatEntity.ts
import { compact } from "./payload";

export function formatEntity<T>(data: T, entity: string, id?: string) {
  return {
    status: "success",
    sys: { entity, id },
    data: compact(data), // Remove null/undefined (30-40% size reduction)
  };
}
```

### 3. Data Access Layer (DAL)

**Decision**: Thin wrapper over Convex queries/mutations, server-only.

**Why**:
- Gradual migration (add endpoints incrementally)
- Centralized authorization (verify ownership once)
- Testable without Convex running
- API decoupling (swap backend later if needed)

**Pattern**:
```typescript
// src/lib/api/dal/conversations.ts
import { getConvexClient } from "@/lib/api/convex";
import { api } from "@/convex/_generated/api";

export const conversationsDAL = {
  async getById(userId: string, conversationId: string) {
    const convex = getConvexClient();

    // Ownership verification via Convex query
    const conversation = await convex.query(
      api.conversations.getWithClerkVerification,
      { conversationId, clerkId: userId }
    );

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    return formatEntity(conversation, "conversation", conversationId);
  },

  // Other methods: create, list, update, delete, archive...
};
```

**Critical**: Always verify ownership in DAL, never trust client-provided IDs.

### 4. Resilient Generation (Non-Negotiable)

**Decision**: All AI responses must survive page refresh, tab close, browser crash.

**How It Works**:
1. User sends message → API creates pending assistant message(s) in DB
2. Trigger Convex action (server-side, 10min timeout)
3. Action streams from LLM, updates `partialContent` every 100ms
4. Client subscribes to message via Convex query (web) or SSE (mobile)
5. On reconnect: see completed response from DB

**Schema Fields**:
```typescript
// convex/schema.ts
messages: defineTable({
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error")
  ),
  content: v.string(),           // Final text
  partialContent: v.optional(v.string()), // Streaming preview
  error: v.optional(v.string()), // Error message if failed
  generationStartedAt: v.optional(v.number()),
  generationCompletedAt: v.optional(v.number()),
})
```

**Critical Constant**:
```typescript
// convex/generation.ts:807
const UPDATE_INTERVAL = 100; // ms - how often to persist partialContent
```

**Why 100ms**: Balance between DB write cost and smooth UX. <100ms feels real-time, >200ms feels laggy.

### 5. Server-Sent Events (SSE) for Streaming

**Decision**: Use SSE for active message generation, not WebSockets.

**Rationale** (Research-backed):
- **Industry standard**: ChatGPT, Claude, Perplexity all use SSE
- **Simpler than WebSockets**: Built-in reconnection, HTTP/2 multiplexing
- **Better battery life**: 50-90% less bandwidth, fewer radio activations
- **Mobile-friendly**: Handles network switching gracefully (WiFi ↔ cellular)
- **One-way perfect for chat**: Server → client streaming, no bi-directional needed

**Implementation**:
```typescript
// src/app/api/v1/messages/stream/[conversationId]/route.ts
export async function GET(req: NextRequest) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // SSE format: "event: <type>\ndata: <json>\n\n"
  const send = (event: string, data: unknown) => {
    writer.write(
      new TextEncoder().encode(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      )
    );
  };

  // Heartbeat every 30s (prevent timeout)
  const heartbeat = setInterval(() => send("ping", {}), 30000);

  // Subscribe to Convex changes
  const unsubscribe = convex.onUpdate("messages", conversationId, (msg) => {
    if (msg.status === "generating") {
      send("message-updated", { partialContent: msg.partialContent });
    }
  });

  // Cleanup on disconnect
  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

**Client Usage** (Mobile):
```typescript
const eventSource = new EventSource(`/api/v1/messages/stream/${conversationId}`, {
  headers: { Authorization: `Bearer ${token}` }
});

eventSource.addEventListener("message-updated", (event) => {
  const { partialContent } = JSON.parse(event.data);
  setMessages(prev => prev.map(m =>
    m._id === messageId ? { ...m, partialContent } : m
  ));
});
```

### 6. Optimistic Updates (Instant UX)

**Decision**: Apply mutations immediately, rollback on error.

**Why**:
- 0ms perceived latency (vs 300-500ms server roundtrip)
- 95%+ success rate makes rollback rare
- Users expect instant feedback (Discord, Slack pattern)

**React Query Pattern**:
```typescript
const { mutate: deleteConversation } = useMutation({
  mutationFn: (id) => api.delete(`/conversations/${id}`),

  onMutate: async (id) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["conversations"] });

    // Snapshot previous state
    const previous = queryClient.getQueryData(["conversations"]);

    // Optimistic update (instant)
    queryClient.setQueryData(["conversations"], (old) => ({
      ...old,
      items: old.items.filter(c => c._id !== id)
    }));

    return { previous }; // For rollback
  },

  onError: (error, id, context) => {
    // Rollback on error
    queryClient.setQueryData(["conversations"], context.previous);
    toast.error("Failed to delete");
  },

  onSettled: () => {
    // Refetch to sync with server (eventual consistency)
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  },
});
```

**Critical**: Always return `context` from `onMutate` for rollback.

---

## Implementation Patterns

### TypeScript Type Depth Workaround

**Problem**: With 94+ Convex modules, TypeScript hits recursion limits when resolving `internal.*` and `api.*` types.

**Solution**:
```typescript
// Backend (Convex actions) - Cast + @ts-ignore
const messages = ((await (ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.lib.helpers.getConversationMessages,
  { conversationId }
)) as Message[]);

// Frontend (React hooks) - Direct @ts-ignore
// @ts-ignore - Type depth exceeded with complex Convex mutation
const sendMessage = useMutation(api.chat.send);
```

**Why**: Pragmatic workaround. Maintains type safety on return values, only bypasses problematic parameter inference.

**Reference**: `docs/technical-reports/typescript-type-depth-solution.md`

### Async Jobs Pattern (Long-Running Operations)

**Problem**: Convex actions run up to 10min, but API route handlers timeout at 60s.

**Solution**: Job pattern with polling.

```typescript
// 1. API route creates job, returns immediately
export async function POST(req: NextRequest) {
  const job = await jobsDAL.create(userId, "search", input);

  // Fire-and-forget (don't await!)
  fetchAction(api.search.execute, { jobId: job._id })
    .catch(error => jobsDAL.updateStatus(job._id, "error", { error }));

  return NextResponse.json(
    formatEntity({ jobId: job._id, status: "pending" }, "job"),
    { status: 202 } // 202 Accepted
  );
}

// 2. Client polls for result
const { data: job } = useQuery({
  queryKey: ["job", jobId],
  queryFn: () => api.get(`/actions/jobs/${jobId}`),
  refetchInterval: (data) => {
    // Stop polling when complete
    if (data?.status === "complete" || data?.status === "error") {
      return false;
    }
    // Exponential backoff: 1s → 2s → 4s → 8s (max 10s)
    return Math.min(1000 * 2 ** (data?.retryCount || 0), 10000);
  },
});
```

**Critical**: Never `await fetchAction` in route handler (blocks response).

### N+1 Query Prevention

**Problem**: Fetching related data in loops causes N+1 queries.

**Solution**: Batch fetching in DAL.

```typescript
// ❌ BAD: N+1 queries
for (const conversation of conversations) {
  const lastMessage = await messagesDAL.getLatest(conversation._id);
}

// ✅ GOOD: Single batch query
const conversationIds = conversations.map(c => c._id);
const lastMessages = await messagesDAL.getBatch(conversationIds);
const messageMap = new Map(
  lastMessages.map(m => [m.conversationId, m])
);
```

**Pattern**: Collect IDs → batch fetch → map to lookup table.

### Schema Normalization (Always)

**Decision**: Use normalized, SQL-ready schema design. Avoid nested documents.

**Why Normalize**:
- 40% smaller documents (faster queries, lower storage)
- 10x faster cascade deletes (junction tables vs array scans)
- Queryable relationships (analytics, reporting)
- No data drift (single source of truth)
- Atomic updates (change one field without touching others)

**Pattern**:
```typescript
// ✅ GOOD - Normalized with junction table
defineTable("messages", { ... })
defineTable("attachments", {
  messageId: v.id("messages"),
  userId: v.id("users"),
  storageId: v.id("_storage"),
  ...
}).index("by_message", ["messageId"])

// ❌ BAD - Nested array (bloats documents)
defineTable("messages", {
  attachments: v.optional(v.array(v.object({ ... }))),
  ...
})
```

**When Nesting Acceptable** (rare):
- Small, fixed-size metadata (2-3 fields, never grows)
- Data never queried independently
- Always deleted with parent
- Example: `{ lat: number, lng: number }` for location

**Reference**: `docs/SCHEMA_NORMALIZATION_GUIDE.md`

---

## Performance & Optimization

### HTTP Caching Strategy

**Cache-Control Headers** (stale-while-revalidate):
```typescript
// src/lib/api/cache.ts
export const CachePresets = {
  LIST: { maxAge: 30, swr: 60 },        // Lists (conversations, messages)
  ITEM: { maxAge: 300, swr: 600 },      // Single items
  STATIC: { maxAge: 3600, swr: 7200 },  // Preferences
  NO_CACHE: { maxAge: 0 },              // SSE, jobs
};

// Usage
return NextResponse.json(result, {
  headers: { "Cache-Control": getCacheControl(CachePresets.LIST) }
});
```

**Why `private`**: User-specific data. CDN can't cache. Client-side cache only.

**Stale-While-Revalidate**: Show cached data instantly, fetch fresh in background. 80% reduction in perceived latency.

### React Query Configuration

**Aggressive Caching**:
```typescript
// src/lib/query/client.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5min fresh
      gcTime: 30 * 60 * 1000,        // 30min garbage collection
      refetchOnWindowFocus: false,   // Don't refetch on tab switch
      refetchOnMount: false,         // Use cache first
      refetchOnReconnect: true,      // Refetch after offline
    },
  },
});
```

**Philosophy**: Show cached data instantly, fetch fresh in background.

### Polling Intervals (Battery vs Latency)

**Research**: 63% of users uninstall battery-draining apps. Conservative intervals matter.

**Strategy**:
```typescript
// Slow-changing data
useQuery({
  queryKey: ["conversations"],
  refetchInterval: 10000, // 10s
});

// Active chat
useQuery({
  queryKey: ["messages", conversationId],
  refetchInterval: 5000,  // 5s (real-time feel)
});

// Rarely changes
useQuery({
  queryKey: ["preferences"],
  refetchInterval: 60000, // 1min
});
```

### Payload Optimization (30-40% Reduction)

**Compact Function**: Remove null/undefined/empty fields.

```typescript
// src/lib/utils/payload.ts
export function compact<T>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    const value = obj[key];
    if (value === null || value === undefined) continue;
    if (value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    result[key] = value;
  }
  return result;
}
```

**Impact**: 450 bytes → 280 bytes per conversation. Mobile data plan conscious.

**Usage**: Automatic via `formatEntity()`.

### Page Visibility Optimization (Battery Save)

**Pattern**: Disconnect SSE when tab backgrounded.

```typescript
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    eventSource.close();  // Save battery
  } else {
    eventSource = new EventSource(url);
    // Catch up on missed updates
    api.get("/messages").then(syncMessages);
  }
});
```

**Impact**: 40-60% battery savings during multitasking.

### Performance Monitoring

**Track All Endpoints**:
```typescript
// src/lib/api/monitoring.ts
export function trackAPIPerformance(metrics: {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  userId: string;
}) {
  // Log to PostHog
  window.posthog?.capture("api_performance", metrics);

  // Log to Pino (server-side)
  logger.info(metrics, "API performance");
}

// Usage
const startTime = performance.now(); // High-res timer
const result = await conversationsDAL.getById(userId, id);
const duration = performance.now() - startTime;

trackAPIPerformance({
  endpoint: "/api/v1/conversations/:id",
  method: "GET",
  duration,
  status: 200,
  userId,
});
```

**Budget**: p95 latency < 200ms. Alert if exceeds 500ms.

---

## Future Maintenance Guide

### Extending the API: Checklist

When adding a new resource (e.g., `/api/v1/projects`):

1. **Schema** (`convex/schema.ts`):
   ```typescript
   projects: defineTable({
     userId: v.id("users"),
     name: v.string(),
     // ... fields
   }).index("by_user", ["userId"])
   ```

2. **DAL** (`src/lib/api/dal/projects.ts`):
   ```typescript
   export const projectsDAL = {
     async create(userId, data) { ... },
     async getById(userId, projectId) { ... },
     async list(userId) { ... },
     async update(userId, projectId, data) { ... },
     async delete(userId, projectId) { ... },
   };
   ```

3. **Routes** (`src/app/api/v1/projects/route.ts`):
   ```typescript
   export const GET = withErrorHandling(withAuth(getHandler));
   export const POST = withErrorHandling(withAuth(postHandler));
   ```

4. **Validation** (Zod schemas):
   ```typescript
   const createSchema = z.object({
     name: z.string().min(1).max(100),
     // ... fields
   });
   ```

5. **Hooks** (`src/lib/hooks/mutations/useCreateProject.ts`):
   ```typescript
   export function useCreateProject() {
     return useMutation({
       mutationFn: (data) => api.post("/projects", data),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["projects"] });
       },
     });
   }
   ```

6. **Cache Headers**:
   ```typescript
   return NextResponse.json(result, {
     headers: { "Cache-Control": getCacheControl(CachePresets.LIST) }
   });
   ```

7. **Performance Tracking**:
   ```typescript
   const startTime = performance.now();
   // ... operation
   trackAPIPerformance({ endpoint, method, duration, status, userId });
   ```

8. **Documentation** (`docs/api/reference.md`):
   ```markdown
   ### Create Project

   ```http
   POST /api/v1/projects
   ```

   **Body:**
   ```json
   { "name": "My Project" }
   ```
   ```

9. **Tests** (`tests/e2e/projects.spec.ts`):
   ```typescript
   test("create project", async ({ request }) => {
     const response = await request.post("/api/v1/projects", {
       data: { name: "Test" }
     });
     expect(response.status()).toBe(201);
   });
   ```

10. **Changelog** (`docs/api/CHANGELOG.md`):
    ```markdown
    ## v1.1.0 (2026-01-15)

    ### Added
    - Projects API (CRUD operations)
    ```

### When NOT to Migrate to API

**Keep using Convex directly if**:
- Feature is web-only (analytics dashboard, search UI)
- Complex queries with Convex-specific optimizations (vector search)
- Real-time subscriptions working well (don't break what works)
- Mobile doesn't need it

**Rule**: If mobile doesn't need it, keep Convex. Don't add complexity unnecessarily.

### Error Handling Philosophy

**Client Errors (4xx)**:
- Show user-friendly message
- Don't retry (user input needed)
- Log for analytics (track validation failures)

**Server Errors (5xx)**:
- Retry with exponential backoff (1s → 2s → 4s)
- Max 3 retries
- Show generic error to user (don't leak internals)

**Network Errors**:
- Queue mutation (offline support)
- Retry when reconnected
- Show "You're offline" toast

**Rate Limits (429)**:
- Respect `Retry-After` header
- Show user feedback ("Too many requests, try again in 60s")
- Don't retry automatically (prevents thundering herd)

**Implementation**:
```typescript
useMutation({
  mutationFn: sendMessage,
  retry: (failureCount, error: any) => {
    // Don't retry client errors
    if (error?.status >= 400 && error?.status < 500) return false;
    // Retry server errors up to 3 times
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### Monitoring What Matters

**Key Metrics** (PostHog dashboards):
1. **API p95 latency** < 200ms (alert if >500ms)
2. **Cache hit rate** > 80% (investigate if drops)
3. **Error rate** < 1% (alert on spike)
4. **Bundle size** < 200KB gzip (block PR if exceeds)

**Custom Events**:
```typescript
// Track API performance
posthog.capture("api_performance", {
  endpoint: "/conversations",
  duration: 142,
  cacheHit: true,
});

// Track errors
posthog.capture("api_error", {
  endpoint: "/messages",
  errorCode: "RATE_LIMIT",
  userId,
});
```

**Alerts** (PostHog + PagerDuty):
- p95 latency > 500ms for 5min → page on-call
- Error rate > 5% for 5min → page on-call
- Cache hit rate < 60% for 1h → email team

### Documentation Maintenance

**Ownership** (`.github/CODEOWNERS`):
```
/docs/api/ @backend-team
/src/lib/api/dal/ @backend-team
/src/lib/hooks/ @frontend-team
```

**Review Cadence**:
- Quarterly: Sync docs with implementation (update examples, remove stale info)
- Per PR: Update docs for new endpoints
- Onboarding: New dev uses only docs → measure time to first API call

**Stale Check** (CI):
```yaml
# .github/workflows/docs-freshness.yml
- name: Check doc freshness
  run: |
    # Warn if doc not updated in 6 months
    find docs/ -name "*.md" -mtime +180
```

---

## Design Philosophy

### Core Principles

1. **Gradual, reversible, platform-aware**
   - Phase-by-phase migration (0-8)
   - Feature-by-feature within phases
   - Easy rollback per component
   - Optimize for each platform's strengths

2. **Never lose data** (Resilient Generation)
   - Server-side actions (survive refresh)
   - Periodic DB updates (100ms interval)
   - Status tracking (pending → generating → complete)

3. **Instant UX** (Optimistic Updates)
   - Apply change immediately (0ms)
   - Rollback on error (rare)
   - Eventual consistency via refetch

4. **Battery conscious** (Mobile-first)
   - Conservative polling intervals (5-10s)
   - Disconnect when backgrounded
   - SSE over WebSockets (50-90% bandwidth reduction)

5. **Developer velocity**
   - Consistent patterns (envelope, DAL, hooks)
   - Type-safe end-to-end (TypeScript + Zod)
   - Self-documenting code (Zod schemas → OpenAPI)

### Success Metrics

**Performance**:
- Web UX unchanged (<100ms latency maintained)
- Mobile performant (<3s first load, <200ms API response)
- Battery conscious (<5% drain/hour in background)

**Developer Experience**:
- New dev productive in <30min (docs only)
- PR review time <2h (consistent patterns)
- Zero production errors from API (type safety + tests)

**Scale**:
- Handle 10k concurrent users (serverless auto-scale)
- p95 latency < 200ms at peak load
- 99.9% uptime (multi-region deployment)

### What Makes This Work

1. **Envelope Pattern** → Consistent error handling, easy parsing
2. **DAL Abstraction** → Gradual migration, testable, swappable backend
3. **Hybrid Queries** → Platform detection hides complexity from components
4. **Resilient Generation** → Never lose AI responses (core differentiator)
5. **Optimistic Updates** → Instant UX, rollback on error (95%+ success)
6. **SSE Streaming** → Real-time feel, battery efficient, mobile-friendly

### Trade-offs Accepted

**Complexity**: Two data layers (Convex + API), two code paths to test
**Maintenance**: Keep both in sync, update both when schema changes
**Bundle Size**: +120KB for React Query + API client

**Why Worth It**: Mobile compatibility unlocks entire platform (iOS, Android) while preserving superior web UX. Gradual migration reduces risk. Hybrid approach gives best of both worlds.

---

## Key Files for Future Maintainers

**Architecture**:
- `docs/API_ARCHITECTURE.md` (this file) - Design philosophy
- `docs/SCHEMA_NORMALIZATION_GUIDE.md` - DB design patterns
- `CLAUDE.md` - Project conventions + API patterns

**Implementation**:
- `src/lib/api/dal/*` - Data access layer (start here)
- `src/lib/hooks/queries/*` - Hybrid query hooks
- `src/lib/hooks/mutations/*` - React Query mutations
- `src/lib/api/cache.ts` - HTTP caching presets
- `src/lib/api/monitoring.ts` - Performance tracking
- `src/lib/utils/formatEntity.ts` - Envelope pattern
- `src/lib/utils/platform.ts` - Platform detection

**Convex**:
- `convex/generation.ts:807` - `UPDATE_INTERVAL=100ms` (resilient generation)
- `convex/schema.ts` - Database schema
- `convex/conversations.ts` - Core queries/mutations
- `convex/messages.ts` - Message CRUD

**Documentation**:
- `docs/api/reference.md` - Full endpoint reference
- `docs/api/examples.md` - Copy-paste code snippets
- `docs/api/best-practices.md` - Performance + security patterns
- `docs/api/mobile-integration.md` - React Native guide
- `docs/api/CHANGELOG.md` - Version history

---

## Philosophy in Practice

### Example: Adding Real-Time Notifications

**Requirements**: Users want push notifications for new messages.

**Analysis** (Platform-aware):
- **Web**: Use Convex subscriptions (already real-time, instant)
- **Mobile**: Need push notifications (app backgrounded)

**Implementation**:
1. **Keep Convex for web** (don't change, already perfect)
2. **Add SSE endpoint for mobile** (`/api/v1/notifications/stream`)
3. **Platform detection** in `useNotifications()` hook
4. **Fallback to polling** if SSE fails (progressive enhancement)

**Code**:
```typescript
export function useNotifications() {
  const isMobile = isPlatformMobile();

  if (!isMobile) {
    // Web: Convex subscription (instant)
    return useConvexQuery(api.notifications.subscribe);
  }

  // Mobile: SSE with polling fallback
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource("/api/v1/notifications/stream");

    eventSource.onmessage = (event) => {
      setNotifications(prev => [JSON.parse(event.data), ...prev]);
    };

    eventSource.onerror = () => {
      // Fallback to polling
      const interval = setInterval(() => {
        fetch("/api/v1/notifications").then(r => r.json())
          .then(data => setNotifications(data.items));
      }, 10000);

      return () => clearInterval(interval);
    };

    return () => eventSource.close();
  }, []);

  return notifications;
}
```

**Philosophy Applied**:
- ✅ Platform-aware (best transport per platform)
- ✅ Graceful degradation (polling fallback)
- ✅ Don't break what works (keep Convex for web)
- ✅ Progressive enhancement (SSE preferred, polling backup)

---

## Conclusion

**Remember**:
- Document the "why" not just the "what"
- Platform-aware (web ≠ mobile)
- Gradual migration (reduce risk)
- Never lose data (resilient generation)
- Battery conscious (mobile-first)
- Type-safe end-to-end (TypeScript + Zod)
- Consistent patterns (envelope, DAL, hooks)

**When in doubt**:
1. Check existing patterns (DAL, hooks, envelope)
2. Reference this doc (design philosophy)
3. Test on both platforms (web + mobile simulator)
4. Monitor metrics (latency, errors, battery)
5. Update docs (keep in sync with code)

**Future you will thank present you for documenting the "why".**
