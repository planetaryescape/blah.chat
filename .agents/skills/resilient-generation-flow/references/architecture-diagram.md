> Historical Convex reference. The current Postgres workflow is in [the project skill](../SKILL.md). Verify the branch before applying these examples.

# Architecture Diagram with Timings

Detailed flowchart showing every step of resilient generation with typical timings.

---

## Full Flow (Typical: 5s total)

```
T=0ms    [Client Browser]
         User types message, hits send
         │
         └──> POST /api/convex (mutation)

T=50ms   [Convex Mutation: sendMessage]
         ├─ Validate user (10ms)
         ├─ Check rate limits (5ms)
         ├─ Insert user message (10ms)
         ├─ Insert assistant message (status: "pending") (10ms)
         ├─ Schedule action: ctx.scheduler.runAfter(0, ...) (5ms)
         └─> Return { messageId } (10ms)

T=100ms  [Client Browser]
         ← Receives messageId
         useQuery(messages) shows:
         - User message (complete)
         - Assistant message (pending)

T=150ms  [Convex Action: generateResponse] 🚀 Starts
         ├─ Fetch message (status check) (20ms)
         ├─ Update status → "generating" (20ms)
         ├─ Fetch conversation history (50ms)
         ├─ Build system prompts (30ms)
         ├─ Fetch memories (if enabled) (100ms)
         └─> Call streamText() (50ms)

T=400ms  [LLM Streaming Starts]
         First token received
         ├─ Track firstTokenAt timestamp
         └─> Start accumulating in buffer

T=500ms  [Partial Update #1]
         Buffer reaches 50 chars
         ├─ Total content: 50 chars
         └─> updatePartialContent mutation (20ms)

T=520ms  [Client Browser]
         ← useQuery receives update
         UI re-renders with partialContent
         User sees: "Hello! I'd be happy to help you with tha"

T=800ms  [Partial Update #2]
         Buffer reaches 50 chars again
         ├─ Total content: 100 chars
         └─> updatePartialContent mutation (20ms)

T=1200ms [Partial Update #3]
         ├─ Total content: 150 chars
         └─> updatePartialContent mutation (20ms)

         ... (continues every ~100-200ms for 50 chars)

T=4500ms [LLM Stream Complete]
         Final token received
         ├─ Total content: 450 chars
         ├─ Calculate tokens: input=120, output=90
         ├─ Calculate cost: $0.00045
         └─> Start finalization

T=4550ms [Finalization]
         ├─ Update status → "complete" (20ms)
         ├─ Set content = totalContent (20ms)
         ├─ Clear partialContent (included)
         ├─ Set generationCompletedAt timestamp (included)
         ├─ Log tokens + cost (included)
         ├─ Track analytics event (10ms)
         └─> Action complete ✅

T=4600ms [Client Browser]
         ← useQuery receives final update
         UI shows complete message
         Status indicator changes: generating → ✓
```

---

## Resilient Generation (User Refreshes Mid-Stream)

```
T=0ms    [Client] User sends message
T=100ms  [Mutation] Creates message (status: "pending")
T=150ms  [Action] Starts generating
T=400ms  [Action] First token, update partialContent
T=500ms  [Client] Sees partial: "Hello! I'd be..."

T=600ms  💥 [Client] USER REFRESHES PAGE 💥
         Browser closes WebSocket connection

T=650ms  [Client] Page reloads
         ├─ Reconnects to Convex
         ├─ useQuery(messages) fetches from DB
         └─> Sees partialContent: "Hello! I'd be happy to..."

         🎯 NO DATA LOST - Action still running server-side!

T=800ms  [Action] (Still running!) Update #3
         partialContent now: "Hello! I'd be happy to help you with that. Let me..."

T=850ms  [Client] useQuery receives update
         UI continues rendering new partial content

T=4500ms [Action] Stream completes
         Marks status: "complete"

T=4600ms [Client] Shows final message ✅
```

**Key:** Action runs independently of client connection. DB is source of truth.

---

## Error Scenarios

### 1. LLM API Error (T=400ms)

```
T=400ms  [Action] Calls streamText()
         ↓
         Error: "API rate limit exceeded"
         ↓
T=450ms  [Error Handler]
         ├─ Catch error
         ├─ Update status → "error"
         ├─ Set error field: "API rate limit exceeded"
         ├─ Track error in Sentry
         └─> Action exits

T=500ms  [Client]
         ← useQuery sees status: "error"
         UI shows error message to user
         Retry button available
```

### 2. Action Timeout (10min limit)

```
T=0ms      [Action] Starts generation
T=600000ms [Convex] 10 minute limit reached
           Action forcefully terminated

           ⚠️ Problem: Last partialContent persists as-is
           Message stuck in "generating" state

           Fix: Add timeout detection
```

**Timeout Detection Pattern:**
```typescript
// Check if generation is taking too long
const elapsed = Date.now() - message.generationStartedAt;
if (elapsed > 9 * 60 * 1000) { // 9 minutes (1min buffer)
  throw new Error("Generation timeout - please retry with shorter context");
}
```

---

## Comparison: Client-Only vs Server-Side

### Client-Only Streaming (Vercel AI UI)

```
T=0ms    [Client] Calls API route
T=50ms   [API Route] Starts streamText, pipes to response
T=100ms  [Client] Receives stream chunks
         ├─ Accumulates in useState
         └─> Updates UI

T=2000ms 💥 USER REFRESHES 💥
         Stream lost
         Response incomplete
         ❌ All data gone
```

### Server-Side Streaming (blah.chat)

```
T=0ms    [Client] Calls mutation
T=50ms   [Mutation] Schedules action, returns
T=100ms  [Action] Starts, streams, persists to DB

T=2000ms 💥 USER REFRESHES 💥
         Action continues
         DB has partialContent
         ✅ No data lost
```

---

## Performance Metrics

### Typical Generation (gpt-4o, 100 tokens output)

| Stage | Time | Percentage |
|-------|------|-----------|
| Mutation (sendMessage) | 50ms | 1% |
| Action startup + context fetch | 200ms | 4% |
| LLM first token (TTFT) | 250ms | 5% |
| Streaming (10 tok/s) | 10s | 90% |
| Finalization | 50ms | <1% |
| **Total** | **10.55s** | **100%** |

### Breakdown by Component

**Database Operations:**
- Insert user message: 10ms
- Insert assistant message: 10ms
- Update partialContent (per update): 20ms
- Final update (status + content): 20ms

**LLM Streaming:**
- Time to first token (TTFT): 250ms avg
- Tokens per second: 10-30 (model-dependent)
- Update frequency: Every 50 chars (~100-200ms)

**Total DB Writes per Generation:**
- Initial inserts: 2
- Partial updates: 8-15 (depends on response length)
- Final update: 1
- **Total: 11-18 writes**

---

## Scalability Limits

### Convex Action Limits

**Per Action:**
- Max duration: 10 minutes
- Max DB writes: Unlimited (but rate-limited)
- Max memory: 512MB

**Per Account:**
- Concurrent actions: 100 (default tier)
- Actions per minute: 1000+ (depends on tier)

### Realistic Throughput

**Single Convex deployment:**
- Concurrent generations: 100
- Messages per minute: 600+ (assuming 10s avg generation)
- Daily capacity: 800,000+ messages

**Bottleneck:** LLM API rate limits (not Convex)

---

## Debugging Timeline

When debugging "message stuck", check these timestamps:

```typescript
const message = await ctx.db.get(messageId);

console.log({
  created: message._creationTime,
  startedGeneration: message.generationStartedAt,
  completed: message.generationCompletedAt,
  status: message.status,
  elapsed: Date.now() - message.generationStartedAt,
});
```

**Expected values:**
- `startedGeneration` exists → Action started
- `elapsed < 600000` (10min) → Not timed out
- `status === "generating"` + `elapsed > 30000` → Likely stuck, check logs
- `status === "error"` → Check `message.error` field
