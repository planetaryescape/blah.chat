# Tiered API Architecture - Selection Guide

## Overview

This guide helps you choose the right API tier for new operations based on **actual duration**, not perceived complexity.

**Why Tiers Matter**:
- Using jobs/polling for fast ops adds 3s+ latency (search was 7x slower!)
- Using sync for slow ops causes timeouts and poor UX
- Mobile battery life: polling intervals matter (1s vs 10s = 50-70% savings)

---

## Decision Tree

```
┌─────────────────────────────────────┐
│ Measure actual duration in dev     │
│ (don't guess - profile it!)        │
└─────────────────┬───────────────────┘
                  │
      ┌───────────▼──────────┐
      │ Duration < 5s?       │
      └───┬──────────────┬───┘
          │              │
       YES│              │NO
          │              │
    ┌─────▼─────┐  ┌────▼─────────┐
    │ Tier 1    │  │ Duration      │
    │ Sync      │  │ 5-30s?        │
    └───────────┘  └───┬──────┬────┘
                       │      │
                    YES│      │NO
                       │      │
                 ┌─────▼──┐  ┌▼──────┐
                 │ Tier 2 │  │ Tier 3│
                 │ SSE    │  │ Polling
                 └────────┘  └───────┘
```

---

## Tier 1: Synchronous (< 5s)

**Pattern**: Direct HTTP request → immediate response

**When to Use**:
- Operations completing in < 5 seconds
- No progress updates needed
- Examples: search (200-500ms), CRUD (50-200ms)

**Architecture**:
```typescript
// Route handler
export const POST = withErrorHandling(withAuth(async (req, { userId }) => {
  const validated = schema.parse(await req.json());

  // Direct Convex action call
  const result = await fetchAction(api.path.to.action, validated);

  return Response.json(formatEntityList(result, "entity"));
}));
```

**Client Hook**:
```typescript
const { data } = useQuery({
  queryKey: ['operation', input],
  queryFn: () => fetch('/api/v1/operation', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then(r => r.json()),
});
```

**Benefits**:
- ✅ No polling overhead (3s → 0.5s for search)
- ✅ Simpler code (no jobs table)
- ✅ Immediate results

**Tradeoffs**:
- ❌ No progress visibility
- ❌ Timeout risk if operation > 5s

**Industry Standards**:
- Google Cloud API: 10s threshold
- AWS API Gateway: 29s hard timeout
- GitHub/Stripe: Sync for < 5s ops

---

## Tier 2: SSE Streaming (5-30s)

**Pattern**: SSE stream with progress updates + polling fallback

**When to Use**:
- Operations taking 5-30 seconds
- Progress updates improve UX (show "Analyzing message 3/10")
- Examples: memory extraction (5-15s), title generation (3-8s)

**Architecture**:
```typescript
// Route handler
import { createSSEResponse, createHeartbeat } from '../_lib/sse-helpers';

export const POST = withErrorHandling(withAuth(async (req, { userId }) => {
  return createSSEResponse(async (stream) => {
    const jobId = await createJob(userId, input);
    const stopHeartbeat = createHeartbeat(stream, 30000);

    try {
      // Poll job status with backoff
      let interval = 1000; // Start 1s
      while (true) {
        await new Promise(r => setTimeout(r, interval));

        const job = await getJobStatus(jobId);

        if (job.progress) {
          stream.sendProgress(jobId, {
            current: job.progress.current,
            message: job.progress.message,
          });
        }

        if (job.status === 'completed') {
          stream.sendComplete(jobId, job.result);
          break;
        }

        if (job.status === 'failed') {
          stream.sendError(jobId, job.error);
          break;
        }

        interval = Math.min(interval * 1.5, 5000); // Max 5s
      }
    } finally {
      stopHeartbeat();
    }
  });
}));
```

**Client Hook**:
```typescript
import { useSSE } from '@/hooks/useSSE';

export function useOperationWithSSE() {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);

  const { data, isLoading, strategy } = useSSE(endpoint);

  // Parse SSE events
  if (data && 'result' in data) {
    setResult(data);
    setEndpoint(null); // Stop SSE
  } else if (data && 'current' in data) {
    setProgress(data);
  }

  const execute = (input) => {
    setEndpoint(`/api/v1/operation?param=${input}`);
    fetch('/api/v1/operation', { method: 'POST', body: JSON.stringify(input) });
  };

  return { execute, isLoading, result, progress, strategy };
}
```

**Benefits**:
- ✅ Real-time progress (better UX than polling)
- ✅ Automatic fallback to polling (95%+ compatibility)
- ✅ 75-90% bandwidth reduction vs polling
- ✅ Jobs table for persistence

**Tradeoffs**:
- ❌ More complex than Tier 1
- ❌ SSE not supported in 5% of clients (graceful fallback)

**Mobile Considerations**:
- Heartbeat prevents carrier timeouts (30s pings)
- Pauses when app backgrounded (battery savings)

---

## Tier 3: Polling (30s+)

**Pattern**: 202 Accepted → poll status with exponential backoff → 200 with result

**When to Use**:
- Operations taking 30+ seconds
- Examples: transcription (30-90s), video analysis (60s+), file embeddings (1-5min)

**Architecture**:
```typescript
// Route handler
export const POST = withErrorHandling(withAuth(async (req, { userId }) => {
  const validated = schema.parse(await req.json());

  const jobId = await createJob(userId, validated);

  return new Response(
    JSON.stringify(formatEntity({ jobId }, "job")),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}));

// Job status endpoint
export const GET = withErrorHandling(withAuth(async (req, { userId, params }) => {
  const { id } = await params;
  const job = await getJobById(id);

  return Response.json(formatEntity(job, "job"));
}));
```

**Client Hook**:
```typescript
import { usePollJob } from '@/hooks/usePollJob';

export function useOperationWithPolling() {
  const [jobId, setJobId] = useState<string | null>(null);
  const createMutation = useMutation({ /* ... */ });

  const {
    result,
    progress,
    status,
    isPending,
    isRunning,
  } = usePollJob(jobId, {
    initialInterval: 1000,   // Start at 1s
    maxInterval: 10000,      // Max 10s
    backoffMultiplier: 1.5,  // 1s → 1.5s → 2.25s → ...
  });

  const execute = async (input) => {
    const id = await createMutation.mutateAsync(input);
    setJobId(id);
  };

  return { execute, isPending, isRunning, result, progress };
}
```

**Benefits**:
- ✅ Handles very long operations (no timeout)
- ✅ Exponential backoff (battery efficient: 1s → 10s)
- ✅ Jobs table for persistence + retry
- ✅ Pauses when app backgrounded

**Tradeoffs**:
- ❌ Delayed feedback (1-10s poll intervals)
- ❌ Most complex pattern

**Mobile Optimizations**:
- `refetchIntervalInBackground: false` (pause polling)
- `refetchOnWindowFocus: true` (resume when active)
- Exponential backoff: 50-70% battery savings

---

## Comparison Table

| Aspect | Tier 1 (Sync) | Tier 2 (SSE) | Tier 3 (Polling) |
|--------|---------------|--------------|------------------|
| **Duration** | < 5s | 5-30s | 30s+ |
| **Endpoint** | `POST /api/v1/operation` | `POST /api/v1/operation` (SSE) | `POST /api/v1/actions/operation` (202) + `GET /api/v1/actions/jobs/:id` |
| **Response** | Immediate result | SSE stream | Job ID → poll status |
| **Progress** | ❌ None | ✅ Real-time events | ⚠️ Delayed (poll interval) |
| **Jobs Table** | ❌ No | ✅ Yes | ✅ Yes |
| **Bandwidth** | Best | Good (75-90% vs polling) | Moderate |
| **Battery** | Best | Good (heartbeat 30s) | Good (backoff 1s → 10s) |
| **Complexity** | Low | Medium | High |
| **Mobile Compat** | 100% | 95% (fallback) | 100% |
| **Example** | Search (500ms) | Memory extraction (10s) | Transcription (60s) |

---

## Implementation Checklist

### Adding a New Tier 1 Operation

- [ ] Measure actual duration (< 5s)
- [ ] Create sync endpoint: `src/app/api/v1/{resource}/route.ts`
- [ ] Direct Convex action call (no jobs)
- [ ] Client: standard `useQuery` or `useMutation`
- [ ] Test: response time < 1s in production

### Adding a New Tier 2 Operation

- [ ] Measure actual duration (5-30s)
- [ ] Create SSE endpoint using `createSSEResponse()`
- [ ] Create job with `createJob()` for persistence
- [ ] Implement progress tracking (update job during execution)
- [ ] Client: hook using `useSSE` (automatic fallback)
- [ ] Test: SSE events stream correctly
- [ ] Test: polling fallback works (disable EventSource)

### Adding a New Tier 3 Operation

- [ ] Measure actual duration (30s+)
- [ ] Create job creation endpoint (returns 202 + jobId)
- [ ] Create job status endpoint (`GET /api/v1/actions/jobs/:id`)
- [ ] Client: hook using `usePollJob` with exponential backoff
- [ ] Test: polling stops on completion
- [ ] Test: exponential backoff works (1s → 10s)
- [ ] Test: pauses when app backgrounded

---

## Common Mistakes

### ❌ Mistake 1: Guessing Duration
```typescript
// BAD: "Search feels slow, must be Tier 3"
const searchEndpoint = createPollingEndpoint(searchAction); // Adds 3s overhead!
```

**Fix**: Profile with `console.time()` or logging:
```typescript
const start = Date.now();
const result = await searchAction();
console.log(`Search took ${Date.now() - start}ms`); // 200-500ms → Tier 1!
```

### ❌ Mistake 2: Using Tier 3 for Tier 2 Operations
```typescript
// BAD: Memory extraction (10s) using polling with 3s intervals
// Result: 3-6s delay before showing progress
```

**Fix**: Use SSE for real-time progress:
```typescript
// GOOD: SSE shows "Analyzing message 3/10" immediately
stream.sendProgress(jobId, { current: 30, message: "Analyzing..." });
```

### ❌ Mistake 3: Forgetting Mobile Optimization
```typescript
// BAD: Fixed 1s polling interval drains battery
const { data } = useQuery({ refetchInterval: 1000 });
```

**Fix**: Use exponential backoff + background pause:
```typescript
// GOOD: 1s → 10s, pause when backgrounded
const { data } = usePollJob(jobId, {
  initialInterval: 1000,
  maxInterval: 10000,
  backoffMultiplier: 1.5,
});
```

---

## Migration Examples

### Example 1: Search (Tier 3 → Tier 1)

**Before** (Tier 3 - SLOW):
```
User types query → POST /api/v1/actions/search (202 Accepted)
                 → Poll every 3s
                 → Wait 3s even though search finishes in 500ms
                 → Total: 3.5s (7x slower!)
```

**After** (Tier 1 - FAST):
```
User types query → POST /api/v1/search/hybrid
                 → Direct response in 500ms
                 → Total: 0.5s ✅
```

**Code Changes**:
- Deleted: `src/app/api/v1/actions/search/route.ts` (jobs-based)
- Created: `src/app/api/v1/search/hybrid/route.ts` (sync)
- Updated: `useSearchResults` hook to use sync endpoint

### Example 2: Memory Extraction (Tier 3 → Tier 2)

**Before** (Tier 3 - NO PROGRESS):
```
User clicks "Extract" → POST /api/v1/actions/extract-memories (202)
                      → Poll every 3s
                      → No progress visibility for 10s
                      → Show spinner only
```

**After** (Tier 2 - REAL-TIME PROGRESS):
```
User clicks "Extract" → POST /api/v1/memories/extract (SSE)
                      → Stream: "Analyzing message 1/10" (0%)
                      → Stream: "Analyzing message 5/10" (50%)
                      → Stream: "Analyzing message 10/10" (100%)
                      → Stream: Complete (10 memories extracted)
```

**Code Changes**:
- Deleted: `src/app/api/v1/actions/extract-memories/route.ts`
- Created: `src/app/api/v1/memories/extract/route.ts` (SSE)
- Created: `useExtractMemoriesWithSSE` hook

---

## Testing Your Tier Choice

### Performance Checklist

**Tier 1 (Sync)**:
- [ ] 95th percentile < 5s in production
- [ ] No timeout errors in logs
- [ ] Response time acceptable on slow connections (3G)

**Tier 2 (SSE)**:
- [ ] Progress events stream every 1-3s
- [ ] Completion event arrives within expected duration
- [ ] Polling fallback works (disable EventSource in DevTools)
- [ ] Mobile: connection survives 5min idle

**Tier 3 (Polling)**:
- [ ] Exponential backoff visible in Network tab (1s → 1.5s → 2.25s)
- [ ] Polling stops on completion (no zombie polls)
- [ ] Mobile: polling pauses when app backgrounded
- [ ] No more than 10s delay between polls

### Load Testing

Use `autocannon` or `k6` to simulate realistic load:

```bash
# Tier 1: Sync endpoint should handle 100+ req/s
bun run autocannon -c 100 -d 10 http://localhost:3000/api/v1/search/hybrid

# Tier 2: SSE endpoint should handle 10+ concurrent streams
bun run autocannon -c 10 -d 30 http://localhost:3000/api/v1/memories/extract

# Tier 3: Polling endpoint should handle 50+ req/s (job status checks)
bun run autocannon -c 50 -d 10 http://localhost:3000/api/v1/actions/jobs/123
```

---

## Mobile App Integration

### React Native / Expo

**Tier 1** works out of the box with `fetch()`.

**Tier 2** requires polyfill:
```typescript
// Install: expo-modules-core + react-native-sse
import { EventSource } from 'react-native-sse';

// Same useSSE hook works!
const { data } = useSSE('/api/v1/memories/extract');
```

**Tier 3** works out of the box with React Query polling.

### iOS Safari Quirks

- SSE connections close after 5min idle → use 30s heartbeat (already implemented)
- Background tabs pause setTimeout → `refetchIntervalInBackground: false` handles this

### Android Chrome Quirks

- SSE max 6 connections per domain → ensure you close streams on unmount
- Aggressive battery optimization → exponential backoff critical

---

## FAQ

**Q: Can I mix tiers in one feature?**
A: Yes! Example: File upload (Tier 1 sync) → embedding generation (Tier 3 polling).

**Q: When should I add progress tracking?**
A: If operation > 5s and has discrete steps (e.g., "Processing file 3/10").

**Q: What if duration varies widely?**
A: Use the 95th percentile. If < 5s for 95% of requests, use Tier 1.

**Q: Can I skip jobs table for Tier 2?**
A: No - jobs provide persistence if SSE disconnects. Without jobs, you lose progress on reconnect.

**Q: Should I use WebSockets instead of SSE?**
A: No - SSE is simpler (unidirectional) and has better fallback. Use WebSockets only for bidirectional chat.

---

## References

- Industry Standards: [Google Cloud API Design Guide](https://cloud.google.com/apis/design/design_patterns#long_running_operations)
- SSE Spec: [MDN Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- React Query Polling: [TanStack Query Interval Docs](https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching)
- Mobile Battery Optimization: [Android Battery Optimization](https://developer.android.com/topic/performance/power)

---

**Last Updated**: 2024-12-12
**Related**: `docs/api-migration/phase-4-actions.md`, `src/lib/api/tiers.ts`
