> Historical Convex reference. The current Postgres workflow is in [the project skill](../SKILL.md). Verify the branch before applying these examples.

# Debugging Playbook

Symptom → diagnosis → fix mapping for common issues.

---

## Issue #1: Message Stuck "Pending"

### Symptoms
- Message created
- Status = "pending"
- Stays pending for >5 seconds
- No partialContent

### Diagnosis

**Step 1:** Check if action started
```bash
convex logs --function generation:generateResponse --since 1m | grep "Started"
```

**Result A:** No "Started" log → Action never scheduled
**Result B:** Has "Started" log → Action running (check phase 2)

### Fix A: Action Never Scheduled

**Cause:** Mutation failed after inserting message

**Check:**
```bash
convex logs --function chat:sendMessage --tail 10
```

**Common errors:**
- "User not found" → Auth issue
- "Rate limit exceeded" → Too many messages
- "Conversation not found" → Invalid conversationId

**Fix:** Address specific error from logs

### Fix B: Action Started but Stuck

**Cause:** Action crashed before updating status

**Check:**
```bash
convex logs --function generation:generateResponse --tail 20 | grep "error"
```

**Common errors:**
- "Model not found" → Invalid modelId
- "Failed to fetch messages" → DB query error

**Fix:** Address specific error from logs

---

## Issue #2: No Partial Content Updates

### Symptoms
- Status = "generating"
- partialContent empty or frozen
- Generation time >5 seconds
- No incremental updates in UI

### Diagnosis

**Step 1:** Check if LLM is responding
```bash
convex logs --function generation:generateResponse | grep "token"
```

**Result A:** No token logs → LLM not responding
**Result B:** Has token logs → LLM working, check DB writes

### Fix A: LLM Not Responding

**Cause:** API error or timeout

**Check:**
1. Provider status page (status.openai.com, etc.)
2. API key validity
3. Rate limits

**Logs to look for:**
- "API rate limit exceeded"
- "Invalid API key"
- "Model unavailable"

**Fix:**
- Wait if provider outage
- Check API key in env vars
- Reduce request rate

### Fix B: LLM Working, No DB Updates

**Cause:** Forgot to write partialContent or UPDATE_INTERVAL too high

**Check code:**
```typescript
// Should see this in streaming loop
if (buffer.length >= UPDATE_INTERVAL) {
  await ctx.runMutation(internal.messages.updatePartialContent, {
    messageId: assistantMessageId,
    partialContent: totalContent,
  });
  buffer = "";
}
```

**Fix:**
1. Ensure `updatePartialContent` called in loop
2. Check UPDATE_INTERVAL (should be ~50)
3. Verify mutation succeeds (check logs)

---

## Issue #3: Generation Never Completes

### Symptoms
- Status = "generating"
- partialContent has text
- No updates for >30 seconds
- Message never reaches "complete"

### Diagnosis

**Step 1:** Check elapsed time
```typescript
const message = await ctx.db.get(messageId);
const elapsed = Date.now() - message.generationStartedAt;
console.log(`Elapsed: ${elapsed}ms`);
```

**Result A:** elapsed > 600000 (10min) → Action timed out
**Result B:** elapsed < 600000 → Action crashed or stuck

### Fix A: Action Timeout

**Cause:** Generation took > 10 minutes (Convex limit)

**Check:** Output length
```typescript
console.log(`Partial content length: ${message.partialContent.length}`);
```

**If >10,000 chars:** LLM generating very long response

**Fix:**
1. Reduce context window (fewer messages)
2. Add explicit length limit in prompt
3. Implement streaming cutoff at 9min

### Fix B: Action Crashed/Stuck

**Cause:** Unhandled error or infinite loop

**Check:**
```bash
convex logs --function generation:generateResponse --tail 50
```

**Look for:**
- Last log entry (where did it stop?)
- Error messages
- Repeated logs (infinite loop?)

**Common causes:**
- Network error mid-stream → Retry logic missing
- DB write failed → Check DB logs
- Parsing error → Check response format

**Fix:** Add error handling around suspected code

---

## Issue #4: Client Not Seeing Updates

### Symptoms
- DB has partialContent (verified in Convex dashboard)
- UI not updating
- useQuery returning stale data

### Diagnosis

**Step 1:** Check subscription
```typescript
// In component
const messages = useQuery(api.messages.list, { conversationId });
console.log("Messages:", messages);
```

**Result A:** `messages === undefined` → Not subscribed
**Result B:** `messages` has data but old → Query not reactive

### Fix A: Subscription Missing

**Cause:** Query not called or args wrong

**Check:**
```typescript
// Ensure conversationId is valid
console.log("ConversationId:", conversationId);

// Ensure query is called
const messages = useQuery(api.messages.list, { conversationId });
```

**Fix:** Verify conversationId and query call

### Fix B: Query Not Reactive

**Cause:** Using wrong query type or missing Suspense

**Check:**
1. Is query a Convex query (not action)?
2. Is component wrapped in `<Suspense>`?

**Fix:**
```tsx
// Correct pattern
export default function ChatPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const messages = useQuery(api.messages.list, { conversationId });
  // ...
}
```

---

## Issue #5: Error Status with No Error Message

### Symptoms
- Status = "error"
- error field is null or empty
- No helpful error message in UI

### Diagnosis

**Step 1:** Check action logs
```bash
convex logs --function generation:generateResponse | grep "error" -A 5
```

**Result:** Full error details in logs

### Fix: Improve Error Capture

**Update action:**
```typescript
try {
  // ... generation code
} catch (error) {
  // Capture full error details
  const errorMessage = error instanceof Error
    ? error.message
    : String(error);

  await ctx.runMutation(internal.messages.updateStatus, {
    messageId: assistantMessageId,
    status: "error",
    error: errorMessage,
  });

  // Log full error for debugging
  console.error("[Generation] Failed:", {
    messageId: assistantMessageId,
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
```

---

## Issue #6: High Error Rate

### Symptoms
- Many messages with status = "error"
- Different error messages
- Affecting multiple users

### Diagnosis

**Step 1:** Aggregate errors
```typescript
const errors = await ctx.db
  .query("messages")
  .withIndex("by_status", q => q.eq("status", "error"))
  .filter(q => q.gt(q.field("_creationTime"), last24Hours))
  .collect();

const errorCounts = errors.reduce((acc, m) => {
  const err = m.error || "Unknown";
  acc[err] = (acc[err] || 0) + 1;
  return acc;
}, {});

console.log(errorCounts);
```

**Common patterns:**
- "API rate limit exceeded" (80% of errors) → Provider issue
- "Invalid model" (50% of errors) → Configuration issue
- "Timeout" (30% of errors) → Performance issue

### Fix: Based on Pattern

**API Rate Limits:**
1. Implement retry with exponential backoff
2. Reduce request rate (queue messages)
3. Upgrade API tier

**Invalid Configuration:**
1. Validate modelId before scheduling action
2. Add fallback to default model
3. Log invalid configs for investigation

**Timeouts:**
1. Reduce context window
2. Implement streaming cutoff
3. Add timeout detection and retry

---

## Quick Commands Reference

```bash
# Watch logs in real-time
convex logs --follow

# Filter by function
convex logs --function generation:generateResponse --follow

# Show last N lines
convex logs --tail 50

# Show logs since time
convex logs --since 5m

# Search logs
convex logs | grep "error" -A 5

# Check specific message
convex query messages:get --messageId <ID>

# Count stuck messages
convex query 'db.query("messages").withIndex("by_status", q => q.eq("status", "generating")).collect()'

# Performance: Average generation time
convex query 'db.query("messages").withIndex("by_status", q => q.eq("status", "complete")).collect().then(msgs => msgs.reduce((sum, m) => sum + (m.generationCompletedAt - m.generationStartedAt), 0) / msgs.length)'
```

---

## Prevention Checklist

- [ ] Error handling in action (try/catch)
- [ ] Timeout detection (<10min limit)
- [ ] Partial updates every ~50 chars
- [ ] Status transitions logged
- [ ] Error messages captured to DB
- [ ] Client uses useQuery (reactive)
- [ ] Suspense wrapper on page
- [ ] Health check monitoring
- [ ] Alert on stuck messages >5min
- [ ] Retry logic for transient errors
