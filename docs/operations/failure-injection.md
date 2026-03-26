# Failure Injection Playbook

Manual and automated procedures for verifying system resilience.

## Automated Tests

Run the unit-level failure injection suite:

```bash
cd apps/web
bun run vitest run src/lib/generation-v2/__tests__/service-failures.test.ts
bun run vitest run src/lib/generation-v2/__tests__/service-resilience.test.ts
```

Run E2E failure tests (requires running dev server + auth):

```bash
cd apps/web
bun run test:e2e -- --grep "Generation Failures"
```

## Manual Failure Scenarios

### 1. Provider Failure

**Setup:** Temporarily set an invalid API key for one provider.

**Steps:**
1. Set `OPENAI_API_KEY=invalid` in `.env.local`
2. Send a message routed to OpenAI
3. Verify: error shown to user, auto-router avoids OpenAI on retry

**Expected:** Error state in UI, retry uses different provider.

### 2. Redis Unavailable

**Setup:** Temporarily set invalid Upstash credentials.

**Steps:**
1. Set `UPSTASH_REDIS_REST_URL=invalid` in `.env.local`
2. Send a message
3. Verify: generation completes (DB-only path), refresh recovers via canonical replay

**Expected:** Streaming may be delayed but content is not lost.

### 3. Network Disconnect During Stream

**Steps:**
1. Open browser DevTools > Network
2. Send a message, wait for streaming to start
3. Toggle "Offline" mode for 5 seconds
4. Toggle back online
5. Verify: streaming resumes, content is not lost

**Expected:** Content recovered via SSE reconnect with sequence-based dedup.

### 4. Rapid Stop/Start

**Steps:**
1. Send a message
2. Click stop after 1-2 seconds
3. Immediately send a new message
4. Verify: first message shows partial content, second message generates normally

**Expected:** No stuck state, clean separation between requests.

### 5. Multiple Rapid Refreshes

**Steps:**
1. Send a message
2. Refresh 3x rapidly during generation
3. Verify: content recovers after each refresh, eventually completes

**Expected:** Checkpoint + canonical replay preserves all content.

### 6. Comparison Mode with Mixed Failures

**Steps:**
1. Start a comparison (2 models)
2. Disable one provider's API key mid-stream (or use a model that's known to fail)
3. Verify: one panel shows error, other completes normally

**Expected:** Mixed status handling — partial failures don't crash the entire request.

## Verifying Results

After each scenario, check:

1. **UI state:** Message shows correct status (complete/error/cancelled)
2. **DB state:** `SELECT status FROM messages WHERE conversation_id = '...'`
3. **Routing outcome:** `SELECT status, ttft_ms, latency_ms FROM routing_outcomes ORDER BY created_at DESC LIMIT 5`
4. **Metrics:** Check Pino logs for `generation_metrics` entries
