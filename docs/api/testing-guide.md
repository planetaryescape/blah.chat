# Tiered API Testing Guide

## Overview

This guide provides systematic testing procedures for all three API tiers, ensuring performance, reliability, and mobile compatibility.

**Testing Philosophy**:
- **Measure, don't assume** - profile actual latency
- **Test failure modes** - network drops, timeouts, race conditions
- **Mobile-first** - battery, backgrounding, carrier timeouts
- **Production parity** - test with realistic network conditions (3G, flaky WiFi)

---

## Quick Reference

| Tier | Key Metrics | Critical Tests |
|------|-------------|----------------|
| **Tier 1** | Latency < 1s | Timeout safety, error handling |
| **Tier 2** | Progress updates, SSE fallback | Stream continuity, polling fallback |
| **Tier 3** | Backoff intervals, completion | Exponential backoff, background pause |

---

## Tier 1: Synchronous API Testing

### Performance Testing

**Goal**: Verify response time < 1s in production conditions

#### Local Testing (Dev)
```bash
# Terminal 1: Start dev server
bun dev

# Terminal 2: Measure latency
time curl -X POST http://localhost:3000/api/v1/search/hybrid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "test search"}'

# Expected: < 500ms (local, no network)
```

#### Production Testing
```typescript
// Add to endpoint temporarily for profiling
const start = Date.now();
const result = await fetchAction(api.search.hybridSearch, validated);
const duration = Date.now() - start;

logger.info({ duration, resultCount: result.length }, "Search performance");

// Check logs: 95th percentile should be < 1000ms
```

#### Network Conditions Testing

**Chrome DevTools**:
1. Open DevTools → Network tab
2. Enable "Slow 3G" throttling
3. Execute search
4. Verify: < 3s on slow 3G (acceptable for sync)

**If > 3s on 3G**: Consider moving to Tier 2 (SSE)

### Timeout Testing

**Goal**: Verify graceful timeout handling

```typescript
// Simulate slow operation (Convex action)
export const slowSearch = internalAction({
  handler: async (ctx, args) => {
    await new Promise(r => setTimeout(r, 10000)); // 10s delay
    return await ctx.runQuery(internal.search.hybrid.hybridSearch, args);
  },
});
```

**Test**:
1. Call slow endpoint
2. Verify: Timeout after 5-10s (Vercel/Next.js limit)
3. Verify: Error shown to user (not infinite spinner)

**Expected Behavior**:
- Frontend: React Query timeout after 30s (default)
- Backend: Vercel function timeout after 10s (default)
- User sees: "Search timeout - please try again"

### Error Handling Testing

**Goal**: All error states handled gracefully

#### Test Case 1: Invalid Input
```bash
curl -X POST http://localhost:3000/api/v1/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{"query": ""}'  # Empty query

# Expected: 400 Bad Request with validation error
```

#### Test Case 2: Unauthenticated
```bash
curl -X POST http://localhost:3000/api/v1/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
  # No Authorization header

# Expected: 401 Unauthorized
```

#### Test Case 3: Server Error
```typescript
// Temporarily break Convex action
export const hybridSearch = internalAction({
  handler: async () => {
    throw new Error("Simulated error");
  },
});

// Test: Search should return 500 with error message
```

### Load Testing

**Goal**: Endpoint handles 100+ requests/second

```bash
# Install autocannon
bun add -D autocannon

# Run load test
bunx autocannon -c 100 -d 10 http://localhost:3000/api/v1/search/hybrid \
  -m POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -b '{"query": "test"}'

# Expected metrics:
# - Latency p95: < 1000ms
# - Errors: < 1%
# - Requests/sec: > 100
```

### Checklist

- [ ] Local latency < 500ms (avg)
- [ ] Production latency < 1s (p95)
- [ ] 3G latency < 3s
- [ ] Timeout after 5-10s (no infinite hang)
- [ ] Error messages shown to user
- [ ] Load test: 100+ req/s with < 1% errors

---

## Tier 2: SSE Streaming Testing

### SSE Connection Testing

**Goal**: Events stream correctly, fallback works

#### Test Case 1: SSE Success Path
```typescript
// Browser console (manual test)
const es = new EventSource('/api/v1/memories/extract?conversationId=123');

es.addEventListener('progress', (e) => {
  console.log('Progress:', JSON.parse(e.data));
  // Expected: { jobId, current: 0-100, message: "..." }
});

es.addEventListener('complete', (e) => {
  console.log('Complete:', JSON.parse(e.data));
  // Expected: { jobId, result: { extracted: 5 } }
  es.close();
});

es.addEventListener('error', (e) => {
  console.error('Error:', e);
});
```

**Expected Output**:
```
Progress: { jobId: "xyz", current: 0, message: "Loading messages..." }
Progress: { jobId: "xyz", current: 50, message: "Analyzing message 5/10" }
Progress: { jobId: "xyz", current: 100, message: "Complete" }
Complete: { jobId: "xyz", result: { extracted: 5 } }
```

#### Test Case 2: SSE Fallback to Polling
```typescript
// Disable SSE in browser (simulate unsupported client)
window.EventSource = undefined;

const { data, strategy } = useSSE('/api/v1/memories/extract');

// Verify: strategy === "polling"
// Verify: data updates every 3s (pollingInterval)
```

**Chrome DevTools**:
1. Open DevTools → Network tab
2. Look for requests to `/api/v1/memories/extract` (GET, not SSE)
3. Verify: Requests every 3s
4. Verify: Requests stop after completion

### Progress Event Testing

**Goal**: Progress updates arrive in real-time

#### Manual Test (UI)
```tsx
// Add to UI temporarily
const { extract, isExtracting, progress } = useExtractMemoriesWithSSE();

return (
  <div>
    <button onClick={() => extract(conversationId)}>Extract</button>
    {isExtracting && (
      <div>
        <Progress value={progress?.current || 0} />
        <p>{progress?.message}</p>
        <p>Strategy: {strategy}</p> {/* "sse" or "polling" */}
      </div>
    )}
  </div>
);
```

**Expected Behavior**:
1. Click "Extract"
2. Progress bar updates every 1-3s
3. Message updates: "Loading..." → "Analyzing 5/10" → "Complete"
4. Final result shows: "Extracted 5 memories"

#### Automated Test (Mock)
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useExtractMemoriesWithSSE } from '@/hooks/actions/useExtractMemories';

test('progress updates stream correctly', async () => {
  const { result } = renderHook(() => useExtractMemoriesWithSSE());

  // Mock SSE events
  const mockSSE = vi.spyOn(window, 'EventSource');
  mockSSE.mockImplementation(() => ({
    addEventListener: vi.fn((event, handler) => {
      if (event === 'progress') {
        handler({ data: JSON.stringify({ current: 50, message: 'Half done' }) });
      }
    }),
  }));

  result.current.extract('conv_123');

  await waitFor(() => {
    expect(result.current.progress).toEqual({
      current: 50,
      message: 'Half done',
    });
  });
});
```

### Heartbeat Testing

**Goal**: Connection stays alive for 5+ minutes

#### Long-Running Test
```typescript
// Browser console
const es = new EventSource('/api/v1/memories/extract?conversationId=long_test');

let pingCount = 0;
es.addEventListener('ping', () => {
  pingCount++;
  console.log(`Ping #${pingCount} at ${new Date().toISOString()}`);
});

// Expected: Ping every 30s
// After 5min: pingCount === 10
```

**Mobile Test** (iOS Safari):
1. Open app on iPhone
2. Start memory extraction
3. Lock screen (app goes to background)
4. Wait 5min
5. Unlock screen
6. Verify: Connection resumes, no error

### Disconnection Recovery Testing

**Goal**: Reconnects gracefully on network drop

#### Test Case: Network Drop Mid-Stream
```typescript
// Chrome DevTools → Network tab → Offline (toggle mid-stream)

const { data, error, reconnect } = useSSE('/api/v1/memories/extract');

// Expected behavior:
// 1. SSE disconnects
// 2. Hook auto-falls back to polling
// 3. Polling continues from where SSE left off
// 4. No data loss
```

### Checklist

- [ ] SSE events stream every 1-3s
- [ ] Progress bar updates smoothly
- [ ] Completion event arrives within expected duration (5-15s)
- [ ] Polling fallback works (disable EventSource)
- [ ] Heartbeat pings every 30s
- [ ] Connection survives 5min idle
- [ ] Network drop triggers polling fallback
- [ ] Mobile: Connection resumes after unlock

---

## Tier 3: Polling Testing

### Exponential Backoff Testing

**Goal**: Poll intervals increase correctly (1s → 10s)

#### Manual Test (Network Tab)
1. Chrome DevTools → Network tab
2. Trigger transcription
3. Observe requests to `/api/v1/actions/jobs/{id}`
4. Measure time between requests

**Expected Intervals** (backoffMultiplier=1.5):
```
Poll 1: 0s      (immediate)
Poll 2: 1.0s    (1s after poll 1)
Poll 3: 2.5s    (1.5s after poll 2)
Poll 4: 4.75s   (2.25s after poll 3)
Poll 5: 8.13s   (3.38s after poll 4)
Poll 6: 13.19s  (5.06s after poll 5)
Poll 7: 20.78s  (7.59s after poll 6)
Poll 8: 30.78s  (10s after poll 7 - capped at maxInterval)
```

#### Automated Test
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { usePollJob } from '@/hooks/usePollJob';

test('exponential backoff increases intervals', async () => {
  const { result } = renderHook(() => usePollJob('job_123', {
    initialInterval: 1000,
    maxInterval: 10000,
    backoffMultiplier: 1.5,
  }));

  const intervals: number[] = [];
  const originalFetch = global.fetch;
  let lastTime = Date.now();

  global.fetch = vi.fn(async () => {
    const now = Date.now();
    intervals.push(now - lastTime);
    lastTime = now;
    return Response.json({ status: 'running' });
  });

  await waitFor(() => intervals.length >= 5);

  expect(intervals[1]).toBeCloseTo(1000, -2); // ~1s
  expect(intervals[2]).toBeCloseTo(1500, -2); // ~1.5s
  expect(intervals[3]).toBeCloseTo(2250, -2); // ~2.25s

  global.fetch = originalFetch;
});
```

### Completion Detection Testing

**Goal**: Polling stops immediately on completion

#### Test Case: Job Completes After 3 Polls
```typescript
const mockJobStatus = vi.fn()
  .mockResolvedValueOnce({ status: 'pending' })   // Poll 1
  .mockResolvedValueOnce({ status: 'running' })   // Poll 2
  .mockResolvedValueOnce({                        // Poll 3
    status: 'completed',
    result: { text: 'transcription' },
  });

const { result } = renderHook(() => usePollJob('job_123'));

await waitFor(() => {
  expect(result.current.status).toBe('completed');
});

// Verify: No more polls after completion
await new Promise(r => setTimeout(r, 5000));
expect(mockJobStatus).toHaveBeenCalledTimes(3); // Exactly 3 polls
```

### Background Pause Testing

**Goal**: Polling pauses when app backgrounded (mobile battery saving)

#### React Query Configuration
```typescript
const { data } = useQuery({
  queryKey: ['job', jobId],
  queryFn: fetchJobStatus,
  refetchInterval: pollInterval,
  refetchIntervalInBackground: false, // ← Critical!
  refetchOnWindowFocus: true,         // ← Resume on focus
});
```

#### Manual Test (Mobile)
1. Start transcription on mobile device
2. Switch to another app (background current app)
3. Check network logs (Charles Proxy / Proxyman)
4. Verify: No polling requests while backgrounded
5. Switch back to app (foreground)
6. Verify: Polling resumes immediately

#### Desktop Simulation
```typescript
// Browser console
document.addEventListener('visibilitychange', () => {
  console.log('Visibility:', document.visibilityState);
  // "hidden" = backgrounded
  // "visible" = focused
});

// Trigger visibility change:
// - Switch tabs
// - Minimize window
// Expected: Polling pauses when hidden
```

### Timeout Testing

**Goal**: Jobs don't poll forever

#### Test Case: Job Takes Too Long
```typescript
const { result } = renderHook(() => usePollJob('job_123', {
  initialInterval: 1000,
  maxInterval: 10000,
  timeout: 60000, // 1min timeout
}));

// Mock: Job never completes
vi.mocked(fetch).mockResolvedValue(
  Response.json({ status: 'running' })
);

await waitFor(() => {
  expect(result.current.error).toBeDefined();
  expect(result.current.error?.message).toContain('timeout');
}, { timeout: 65000 });
```

### Load Testing

**Goal**: Job status endpoint handles 50+ req/s

```bash
# Simulate 50 concurrent clients polling
bunx autocannon -c 50 -d 30 http://localhost:3000/api/v1/actions/jobs/job_123 \
  -H "Authorization: Bearer $TOKEN"

# Expected:
# - Latency p95: < 500ms (status check is fast)
# - Errors: < 1%
# - Requests/sec: > 50
```

### Checklist

- [ ] Exponential backoff: 1s → 1.5s → 2.25s → 10s (max)
- [ ] Polling stops on completion (no zombie polls)
- [ ] Polling pauses when app backgrounded
- [ ] Polling resumes when app focused
- [ ] Timeout after max duration (60-120s)
- [ ] Load test: 50+ req/s with < 1% errors

---

## Integration Testing (All Tiers)

### End-to-End Flow Testing

**Goal**: Entire user journey works seamlessly

#### Test Scenario: Search → Extract → Transcribe
```typescript
import { test, expect } from '@playwright/test';

test('multi-tier operation flow', async ({ page }) => {
  await page.goto('http://localhost:3000/chat');

  // Tier 1: Search (sync)
  await page.fill('[data-testid="search-input"]', 'test query');
  await page.click('[data-testid="search-button"]');

  // Expect: Results in < 1s
  await expect(page.locator('[data-testid="search-results"]'))
    .toBeVisible({ timeout: 1000 });

  // Tier 2: Extract memories (SSE)
  await page.click('[data-testid="extract-memories"]');

  // Expect: Progress bar visible
  await expect(page.locator('[data-testid="progress-bar"]'))
    .toBeVisible();

  // Expect: Progress updates (check text changes)
  await expect(page.locator('[data-testid="progress-message"]'))
    .toContainText(/Analyzing message \d+\/\d+/);

  // Expect: Completion in < 15s
  await expect(page.locator('[data-testid="extraction-complete"]'))
    .toBeVisible({ timeout: 15000 });

  // Tier 3: Transcribe audio (polling)
  await page.setInputFiles('[data-testid="audio-upload"]', 'test.mp3');
  await page.click('[data-testid="transcribe-button"]');

  // Expect: 202 Accepted with job ID
  await expect(page.locator('[data-testid="job-status"]'))
    .toContainText('Transcribing...');

  // Expect: Completion in < 90s (typical transcription time)
  await expect(page.locator('[data-testid="transcription-result"]'))
    .toBeVisible({ timeout: 90000 });
});
```

### Error Recovery Testing

**Goal**: System recovers from failures

#### Test Case: Network Drops During Operation
```typescript
test('recovers from network drop', async ({ page, context }) => {
  await page.goto('http://localhost:3000/chat');

  // Start SSE memory extraction
  await page.click('[data-testid="extract-memories"]');
  await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

  // Simulate network drop (offline mode)
  await context.setOffline(true);
  await page.waitForTimeout(2000);

  // Re-enable network
  await context.setOffline(false);

  // Expect: Hook falls back to polling, completes successfully
  await expect(page.locator('[data-testid="extraction-complete"]'))
    .toBeVisible({ timeout: 20000 });
});
```

### Mobile-Specific Testing

#### iOS Safari Testing
```typescript
// Use BrowserStack or manual device testing

test('iOS Safari background handling', async ({ device }) => {
  // 1. Start long operation (transcription)
  await device.tap('[data-testid="transcribe-button"]');

  // 2. Background app (lock screen)
  await device.background();

  // 3. Wait 30s
  await device.wait(30000);

  // 4. Foreground app
  await device.foreground();

  // 5. Verify: Operation resumed/completed
  await expect('[data-testid="transcription-result"]').toBeVisible();
});
```

#### Android Chrome Testing
```typescript
test('Android battery optimization', async ({ device }) => {
  // Enable battery saver mode
  await device.enableBatterySaver();

  // Start polling operation
  await device.tap('[data-testid="transcribe-button"]');

  // Monitor network: Should see exponential backoff (not fixed interval)
  const intervals = await device.getNetworkIntervals();
  expect(intervals[0]).toBeCloseTo(1000);  // 1s
  expect(intervals[1]).toBeCloseTo(1500);  // 1.5s
  expect(intervals[2]).toBeCloseTo(2250);  // 2.25s
});
```

---

## Performance Monitoring (Production)

### Metrics to Track

**Tier 1 (Sync)**:
- `api_latency_ms{tier=1}` - p50, p95, p99 latency
- `api_errors_total{tier=1}` - error rate
- `api_timeouts_total{tier=1}` - timeout count

**Tier 2 (SSE)**:
- `sse_connections_active` - concurrent SSE connections
- `sse_fallback_rate` - % of requests falling back to polling
- `sse_disconnect_rate` - % of connections dropping

**Tier 3 (Polling)**:
- `job_poll_count_avg` - avg polls per job
- `job_completion_time_ms` - time from creation to completion
- `job_timeout_rate` - % of jobs timing out

### Logging Examples

#### Tier 1 Latency
```typescript
const start = Date.now();
const result = await fetchAction(api.search.hybridSearch, validated);
const duration = Date.now() - start;

logger.info({
  tier: 1,
  operation: 'search',
  duration,
  resultCount: result.length,
}, 'Tier 1 operation complete');

// Analyze logs:
// cat logs.json | jq 'select(.tier == 1) | .duration' | ... (percentiles)
```

#### Tier 2 SSE Metrics
```typescript
stream.sendComplete(jobId, result);

logger.info({
  tier: 2,
  operation: 'extractMemories',
  duration: Date.now() - startTime,
  progressUpdates: progressCount,
  strategy: 'sse', // or 'polling'
}, 'Tier 2 operation complete');
```

#### Tier 3 Polling Metrics
```typescript
// In usePollJob hook
useEffect(() => {
  if (data?.status === 'completed') {
    logger.info({
      tier: 3,
      operation: 'transcribe',
      jobId,
      pollCount: pollsRef.current,
      duration: Date.now() - startTime,
    }, 'Tier 3 operation complete');
  }
}, [data?.status]);
```

---

## Automated Testing Setup

### Unit Tests (Vitest)

```bash
# Run all API tests
bun test src/app/api

# Run specific tier tests
bun test src/app/api/v1/search          # Tier 1
bun test src/app/api/v1/memories        # Tier 2
bun test src/app/api/v1/actions         # Tier 3
```

### Integration Tests (Playwright)

```bash
# Run E2E tests
bun test:e2e

# Run specific flows
bun test:e2e tests/tier1-search.spec.ts
bun test:e2e tests/tier2-sse.spec.ts
bun test:e2e tests/tier3-polling.spec.ts
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      # Unit tests
      - run: bun install
      - run: bun test

      # E2E tests
      - run: bunx playwright install
      - run: bun test:e2e

      # Load tests (only on main branch)
      - if: github.ref == 'refs/heads/main'
        run: |
          bun run autocannon -c 100 -d 10 ${{ secrets.STAGING_URL }}/api/v1/search/hybrid
```

---

## Debugging Common Issues

### Issue 1: Tier 1 Slower Than Expected

**Symptom**: Search takes 2-3s instead of < 1s

**Debug Steps**:
1. Check Convex logs for action duration
2. Add timing logs in action:
   ```typescript
   const t1 = Date.now();
   const vectorResults = await ctx.vectorSearch(...);
   console.log('Vector search:', Date.now() - t1, 'ms');

   const t2 = Date.now();
   const textResults = await ctx.db.query(...).collect();
   console.log('Text search:', Date.now() - t2, 'ms');
   ```
3. Identify bottleneck (usually vector search or large result set)

**Fix**: Optimize slow query or consider Tier 2 if unavoidable

### Issue 2: SSE Falls Back to Polling Too Often

**Symptom**: `strategy === "polling"` for > 10% of requests

**Debug Steps**:
1. Check browser console for SSE errors
2. Verify CORS headers include SSE-specific headers
3. Test with different browsers (Safari vs Chrome)

**Fix**: Add missing headers, handle SSE-specific errors

### Issue 3: Polling Never Stops

**Symptom**: Job completed but polling continues

**Debug Steps**:
1. Check job status endpoint - verify returns `status: "completed"`
2. Check `refetchInterval` callback - ensure returns `false` on completion
3. Add logging:
   ```typescript
   refetchInterval: (query) => {
     console.log('Job status:', query.state.data?.status);
     if (query.state.data?.status === 'completed') {
       console.log('Stopping poll');
       return false;
     }
     return pollInterval;
   }
   ```

**Fix**: Ensure terminal states (`completed`, `failed`, `cancelled`) return `false`

---

## Checklist: Pre-Deployment

### Tier 1 (Sync)
- [ ] Latency p95 < 1s in staging
- [ ] Load test passed (100+ req/s)
- [ ] Error handling tested (400, 401, 500)
- [ ] Timeout handling works

### Tier 2 (SSE)
- [ ] SSE events stream correctly
- [ ] Polling fallback works
- [ ] Heartbeat prevents timeouts
- [ ] Progress updates visible in UI
- [ ] Mobile testing passed (iOS + Android)

### Tier 3 (Polling)
- [ ] Exponential backoff verified (1s → 10s)
- [ ] Polling stops on completion
- [ ] Background pause works on mobile
- [ ] Timeout after max duration

### All Tiers
- [ ] E2E flow tested (manual or Playwright)
- [ ] Error recovery tested (network drop)
- [ ] Metrics/logging added
- [ ] Documentation updated

---

**Last Updated**: 2024-12-12
**Related**: `docs/api/tier-selection-guide.md`, `src/hooks/usePollJob.ts`, `src/hooks/useSSE.ts`
