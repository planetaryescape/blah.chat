> Historical Convex reference. The current Postgres workflow is in [the project skill](../SKILL.md). Verify the branch before applying these examples.

# Trace Checklist

Step-by-step verification for debugging resilient generation.

---

## Quick Diagnostic

**Run these 3 commands first:**

```bash
# 1. Check recent actions
convex logs --function generation:generateResponse --tail 20

# 2. Check recent mutations
convex logs --function chat:sendMessage --tail 10

# 3. Check DB state
convex query messages:get --messageId <ID>
```

---

## Full Trace (17 Checkpoints)

### Phase 1: Client → Mutation (Expected: 50-100ms)

#### ✓ Checkpoint 1: User Interaction
**What:** User types message, clicks send

**Verify:**
- Console: `handleSend called`
- Network tab: POST request to Convex mutation

**If missing:** Frontend event handler not wired up

---

#### ✓ Checkpoint 2: Mutation Invoked
**What:** `sendMessage` mutation receives request

**Verify:**
```bash
convex logs --function chat:sendMessage
```
Look for: `[chat:sendMessage] Started`

**If missing:**
- Check auth (user signed in?)
- Check network (Convex reachable?)

---

#### ✓ Checkpoint 3: User Message Inserted
**What:** User message written to DB

**Verify:**
```typescript
const userMessages = await ctx.db
  .query("messages")
  .withIndex("by_conversation", q => q.eq("conversationId", conversationId))
  .filter(q => q.eq(q.field("role"), "user"))
  .order("desc")
  .take(1);
```

**If missing:** DB write failed (check error logs)

---

#### ✓ Checkpoint 4: Assistant Message Inserted
**What:** Empty assistant message (status: "pending") created

**Verify:**
```typescript
const pendingMessage = await ctx.db.get(assistantMessageId);
console.log(pendingMessage.status); // Should be "pending"
```

**If missing:** Mutation failed after user message insert

---

#### ✓ Checkpoint 5: Action Scheduled
**What:** `ctx.scheduler.runAfter(0, ...)` called

**Verify:**
Look for log: `Scheduled generation action`

**If missing:** Scheduler call failed (rare Convex issue)

---

#### ✓ Checkpoint 6: Mutation Returns
**What:** Client receives `{ messageId }`

**Verify:**
- Console: `Message sent:`, messageId
- Network tab: 200 OK response

**If missing:** Mutation threw error before return

---

### Phase 2: Action Startup (Expected: 100-300ms)

#### ✓ Checkpoint 7: Action Starts
**What:** `generateResponse` action begins execution

**Verify:**
```bash
convex logs --function generation:generateResponse
```
Look for: `[generation:generateResponse] Started`

**If missing after 1s:**
- Action never scheduled (go back to checkpoint 5)
- Convex backlog (check dashboard for delays)

---

#### ✓ Checkpoint 8: Status → "generating"
**What:** First DB write in action

**Verify:**
```typescript
const message = await ctx.db.get(messageId);
console.log(message.status); // Should be "generating"
console.log(message.generationStartedAt); // Should exist
```

**If missing:** Action started but failed before first write

---

#### ✓ Checkpoint 9: Context Fetched
**What:** Conversation history + memories loaded

**Verify:**
Look for logs:
- `Loaded ${n} messages`
- `Loaded ${n} memories`

**If slow (>500ms):**
- Too many messages (implement pagination)
- Memory search slow (check vector index)

---

### Phase 3: LLM Streaming (Expected: 2-60s)

#### ✓ Checkpoint 10: streamText Called
**What:** Vercel AI SDK starts streaming

**Verify:**
Look for log: `Calling LLM with model: ${modelId}`

**If missing:** Failed before LLM call (check context building)

---

#### ✓ Checkpoint 11: First Token Received
**What:** LLM returns first chunk

**Verify:**
Look for log: `First token received after ${ttft}ms`

**Expected:** 200-800ms (TTFT)

**If slow (>2s):**
- LLM API slow (provider issue)
- Large system prompt (reduce context)

---

#### ✓ Checkpoint 12: First Partial Update
**What:** Buffer reaches 50 chars, first DB write

**Verify:**
```typescript
const message = await ctx.db.get(messageId);
console.log(message.partialContent); // Should have ~50 chars
```

**Expected:** Within 500ms of first token

**If missing:**
- UPDATE_INTERVAL too high
- Forgot to call `updatePartialContent`

---

#### ✓ Checkpoint 13: Continued Updates
**What:** Partial content grows every ~100-200ms

**Verify:**
Watch DB in real-time:
```bash
convex watch messages:get --messageId <ID> --field partialContent
```

**Expected:** Length increases steadily

**If stalled:**
- Stream paused (LLM timeout?)
- DB writes failing (check error logs)

---

#### ✓ Checkpoint 14: Stream Complete
**What:** LLM finishes, no more chunks

**Verify:**
Look for log: `Stream completed, ${totalChars} chars`

**If never completes:**
- LLM timeout (>60s is unusual)
- Stream hung (provider issue)

---

### Phase 4: Finalization (Expected: 50-100ms)

#### ✓ Checkpoint 15: Status → "complete"
**What:** Final DB write with content

**Verify:**
```typescript
const message = await ctx.db.get(messageId);
console.log(message.status); // Should be "complete"
console.log(message.content); // Should equal last partialContent
console.log(message.generationCompletedAt); // Should exist
```

**If missing:**
- Action crashed after stream
- DB write failed

---

#### ✓ Checkpoint 16: Tokens Logged
**What:** Usage tracked for cost calculation

**Verify:**
```typescript
console.log(message.inputTokens); // Should be > 0
console.log(message.outputTokens); // Should be > 0
console.log(message.cost); // Should be > 0
```

**If missing:** Vercel AI SDK didn't return usage data

---

#### ✓ Checkpoint 17: Client Updated
**What:** useQuery receives final state

**Verify:**
- Console: `Message complete:`, messageId
- UI: Shows full message, no loading indicator

**If missing:** Client not subscribed to query

---

## Error Trace (What to Check When Failed)

### Error at Phase 1 (Client → Mutation)

**Symptoms:** User clicks send, nothing happens

**Check:**
1. Browser console errors
2. Network tab (failed request?)
3. Convex auth (signed in?)

---

### Error at Phase 2 (Action Startup)

**Symptoms:** Message stuck "pending" for >1s

**Check:**
```bash
convex logs --function generation:generateResponse --since 1m
```

**If no logs:** Action never started (scheduler issue)

**If error logs:** Read error message, common causes:
- Invalid modelId
- Missing user/conversation
- DB query failed

---

### Error at Phase 3 (LLM Streaming)

**Symptoms:** Status = "generating" but no partialContent updates

**Check:**
```bash
convex logs --function generation:generateResponse --tail 50 | grep "token"
```

**If "First token received":** LLM working, check DB writes

**If no token logs:** LLM not responding
- Check provider status page
- Check API key validity
- Check rate limits

---

### Error at Phase 4 (Finalization)

**Symptoms:** partialContent frozen, never completes

**Check:**
```bash
convex logs --function generation:generateResponse --tail 50 | grep "complete"
```

**If "Stream completed" but no "Finalized":**
- Action crashed after stream
- Check error logs between those lines

**If no "Stream completed":**
- Stream never finished (timeout?)
- Check elapsed time (>10min = timeout)

---

## Performance Benchmarks

Use these to identify slow phases:

| Phase | Expected | Warning | Critical |
|-------|----------|---------|----------|
| Mutation | <100ms | >200ms | >500ms |
| Action startup | <300ms | >500ms | >1s |
| TTFT | <800ms | >2s | >5s |
| Streaming (100 tokens) | 3-10s | >15s | >30s |
| Finalization | <100ms | >200ms | >500ms |

---

## Automated Health Check

Run this periodically to detect issues:

```typescript
export const healthCheck = query({
  handler: async (ctx) => {
    const now = Date.now();
    const oneMinAgo = now - 60_000;

    // Check for stuck messages
    const stuck = await ctx.db
      .query("messages")
      .withIndex("by_status", q => q.eq("status", "generating"))
      .filter(q => q.lt(q.field("generationStartedAt"), oneMinAgo))
      .collect();

    // Check for high error rate
    const recent = await ctx.db
      .query("messages")
      .filter(q => q.gt(q.field("_creationTime"), oneMinAgo))
      .collect();

    const errors = recent.filter(m => m.status === "error");
    const errorRate = errors.length / recent.length;

    return {
      healthy: stuck.length === 0 && errorRate < 0.05,
      stuckMessages: stuck.length,
      errorRate: (errorRate * 100).toFixed(2) + "%",
      recentMessages: recent.length,
    };
  },
});
```

Call every minute from monitoring system.
