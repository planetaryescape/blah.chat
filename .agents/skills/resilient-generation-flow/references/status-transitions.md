> Historical Convex reference. The current Postgres workflow is in [the project skill](../SKILL.md). Verify the branch before applying these examples.

# Status State Machine

All possible status transitions for message generation.

---

## State Diagram

```
     ┌──────────┐
     │ (start)  │
     └────┬─────┘
          │
          ▼
     ┌──────────┐  Action timeout (10min)
     │ pending  │─────────────────────────┐
     └────┬─────┘                         │
          │                               │
          │ Action starts                 │
          ▼                               │
     ┌──────────┐  LLM API error         ▼
     │generating│───────────────────> ┌───────┐
     └────┬─────┘                     │ error │
          │                           └───────┘
          │ Stream completes
          ▼
     ┌──────────┐
     │ complete │
     └──────────┘
```

---

## Transition Table

| From | To | Trigger | Mutation | Where |
|------|-----|---------|----------|-------|
| (none) | `pending` | User sends message | `messages.create` | `convex/chat.ts:118` |
| `pending` | `generating` | Action starts | `messages.updateStatus` | `convex/generation.ts:398` |
| `generating` | `complete` | Stream finishes | `messages.updateStatus` | `convex/generation.ts:600` |
| `generating` | `error` | LLM/network error | `messages.updateStatus` | `convex/generation.ts:650` |
| `pending` | `error` | Action fails to start | `messages.updateStatus` | (rare) |

---

## State Descriptions

### `pending`

**Meaning:** Message created, waiting for action to start.

**Fields:**
- `status`: "pending"
- `content`: `undefined` or `""`
- `partialContent`: `undefined`
- `error`: `undefined`
- `generationStartedAt`: `undefined`

**Expected duration:** 50-200ms

**If stuck:** Action never scheduled or failed to start
- Check: `convex logs --function chat:sendMessage`
- Look for: Error during `ctx.scheduler.runAfter`

---

### `generating`

**Meaning:** Action running, streaming from LLM.

**Fields:**
- `status`: "generating"
- `content`: `undefined` or `""`
- `partialContent`: Accumulating text (updated every ~50 chars)
- `error`: `undefined`
- `generationStartedAt`: Timestamp (Date.now())
- `firstTokenAt`: Timestamp when first token received

**Expected duration:** 2-60 seconds (depends on model + length)

**If stuck:**
- Check elapsed time: `Date.now() - message.generationStartedAt`
- If < 10s: Likely still generating (normal)
- If 10-60s: Long generation (normal for large outputs)
- If > 10min: Action timed out
- If > 60s with no partialContent updates: Likely error (check logs)

---

### `complete`

**Meaning:** Generation finished successfully.

**Fields:**
- `status`: "complete"
- `content`: Final response text
- `partialContent`: Cleared (`""` or `undefined`)
- `error`: `undefined`
- `generationStartedAt`: Timestamp
- `generationCompletedAt`: Timestamp
- `inputTokens`: Count from LLM
- `outputTokens`: Count from LLM
- `cost`: Calculated cost (USD)

**Terminal state:** No further transitions.

---

### `error`

**Meaning:** Generation failed.

**Fields:**
- `status`: "error"
- `content`: `undefined` or partial content before error
- `partialContent`: May contain text before error occurred
- `error`: Error message string
- `generationStartedAt`: Timestamp (if action started)
- `generationCompletedAt`: `undefined`

**Terminal state:** User can retry (creates new message).

---

## Edge Cases

### Resumed Generation After Refresh

**Scenario:** User refreshes while status = "generating"

**Behavior:**
- Client reconnects
- useQuery fetches current state from DB
- If `partialContent` exists → show it
- If action still running → continue showing updates
- If action completed → show final content

**Code detection:**
```typescript
const message = await ctx.runQuery(internal.messages.get, { messageId });
const wasGenerating = message?.status === "generating";
const hasPartialContent = !!message?.partialContent;
const isResumed = wasGenerating && hasPartialContent;
```

---

### Message Deleted During Generation

**Scenario:** User deletes message while action running

**Behavior:**
- Action continues (doesn't know about deletion)
- DB updates fail silently (message doesn't exist)
- Action completes without error

**Prevention:**
```typescript
// In action, before each DB write
const message = await ctx.runQuery(internal.messages.get, { messageId });
if (!message) {
  console.log("Message deleted, aborting generation");
  return;
}
```

---

### Concurrent Regenerations

**Scenario:** User clicks "Regenerate" multiple times quickly

**Behavior:**
- First mutation: Creates message A, schedules action A
- Second mutation: Deletes message A, creates message B, schedules action B
- Action A: Tries to update deleted message (fails silently)
- Action B: Runs normally

**Safe:** Convex ensures action A doesn't corrupt message B.

---

## Database Schema (Relevant Fields)

```typescript
// convex/schema.ts
messages: defineTable({
  // ... other fields
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error")
  ),
  content: v.string(), // Final text
  partialContent: v.optional(v.string()), // Streaming accumulator
  error: v.optional(v.string()), // Error message
  generationStartedAt: v.optional(v.number()),
  generationCompletedAt: v.optional(v.number()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  cost: v.optional(v.number()),
})
```

---

## Monitoring Queries

### Find stuck messages

```typescript
// Messages generating for > 10 minutes
const stuckMessages = await ctx.db
  .query("messages")
  .withIndex("by_status", q => q.eq("status", "generating"))
  .collect()
  .then(msgs => msgs.filter(m =>
    m.generationStartedAt &&
    Date.now() - m.generationStartedAt > 10 * 60 * 1000
  ));
```

### Average generation time

```typescript
const completedToday = await ctx.db
  .query("messages")
  .withIndex("by_status", q => q.eq("status", "complete"))
  .filter(q => q.gt(q.field("_creationTime"), todayStart))
  .collect();

const avgTime = completedToday.reduce((sum, m) =>
  sum + (m.generationCompletedAt - m.generationStartedAt), 0
) / completedToday.length;

console.log(`Average generation time: ${avgTime}ms`);
```

### Error rate

```typescript
const totalToday = await ctx.db
  .query("messages")
  .filter(q => q.gt(q.field("_creationTime"), todayStart))
  .collect();

const errors = totalToday.filter(m => m.status === "error");
const errorRate = (errors.length / totalToday.length) * 100;

console.log(`Error rate: ${errorRate.toFixed(2)}%`);
```

---

## Transition Guarantees

**Guaranteed:**
- `pending` → `generating` (if action starts)
- `generating` → `complete` OR `error` (action always finishes)

**Not guaranteed:**
- Action may never start (Convex outage, scheduling error)
- Message may be deleted before generation completes

**Idempotent:**
- Updating status from `generating` → `generating` is safe
- Updating partialContent multiple times with same value is safe

**Non-reversible:**
- Cannot go from `complete` back to `generating`
- Cannot go from `error` to any other state (terminal)
