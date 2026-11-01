# Historical Convex workflow

Superseded by the Postgres rewrite. Consult only for historical branches; do not apply these examples to current code.

# Resilient Generation Flow

Understand and debug blah.chat's server-side streaming architecture that survives page refresh/tab close.

## Architecture (3 Layers)

```
[Client]                          [Server: Mutation]             [Server: Action]              [Database]
   │                                     │                             │                           │
   │─── sendMessage() ────────────────>│                             │                           │
   │    (user message content)          │                             │                           │
   │                                     │                             │                           │
   │                                     │─ 1. Insert user msg ──────>│                           │
   │                                     │─ 2. Insert assistant msg ──>│ (status: "pending")       │
   │                                     │─ 3. Schedule action ──────>│                           │
   │                                     │    (ctx.scheduler.runAfter) │                           │
   │<── Return immediately ─────────────│                             │                           │
   │    {conversationId, messageId}     │                             │                           │
   │                                     │                             │                           │
   │                                     │                             │<─ Action starts (10min max)
   │                                     │                             │─ Update status: "generating"
   │                                     │                             │─ Fetch conversation history
   │                                     │                             │─ Build system prompts
   │                                     │                             │─ Call LLM (streamText)
   │                                     │                             │                           │
   │                                     │                             │  ┌─ Stream loop ────────┐
   │                                     │                             │  │ for await (chunk)   │
   │                                     │                             │  │   buffer += chunk   │
   │                                     │                             │  │   if (buffer > 50)  │
   │                                     │                             │──│─> updatePartial ───>│
   │                                     │                             │  │   (every 50 chars)  │
   │                                     │                             │  └─────────────────────┘
   │                                     │                             │                           │
   │─── useQuery(messages) ─────────────────────────────────────────────────> Subscribe (reactive)
   │<── Live updates ──────────────────────────────────────────────────────── partialContent updated
   │    (re-renders on DB change)       │                             │                           │
   │                                     │                             │                           │
   │                                     │                             │─ Stream complete
   │                                     │                             │─ Update status: "complete"
   │                                     │                             │─ Store final content
   │                                     │                             │─ Log token usage + cost
   │                                     │                             │─ Track analytics
   │                                     │                             │                           │
   │<── Final render ───────────────────────────────────────────────────────── content persisted
```

**Key insight:** Client can refresh/close at any time - action continues, DB persists progress.

## Status State Machine

```
pending ────> generating ────> complete
   │               │                │
   │               └──────> error   │
   │                               │
   └─────────────────────────────>│ (skip generation if deleted)
```

**Status fields** (convex/schema.ts:messages table):
- `status`: "pending" | "generating" | "complete" | "error"
- `partialContent`: Streaming accumulator (updated every ~50 chars)
- `content`: Final response (set when complete)
- `error`: Error message if status = "error"
- `generationStartedAt`: Timestamp when action started
- `generationCompletedAt`: Timestamp when done

## Component Files

### 1. Client: Send Message

**File:** `src/app/(main)/chat/[conversationId]/page.tsx` (lines 1-80)

```tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function ChatPage() {
  // @ts-ignore - Type depth exceeded
  const sendMessage = useMutation(api.chat.sendMessage);

  // @ts-ignore - Type depth exceeded
  const messages = useQuery(api.messages.list, { conversationId });

  const handleSend = async (content: string) => {
    // Returns immediately - does NOT wait for generation
    const { messageId } = await sendMessage({
      conversationId,
      content,
      modelId: "openai:gpt-4o",
    });

    // UI shows pending state instantly
    // useQuery auto-updates as partialContent streams in
  };

  return (
    <div>
      {messages?.map(msg => (
        <Message
          key={msg._id}
          content={msg.status === "generating" ? msg.partialContent : msg.content}
          status={msg.status}
        />
      ))}
    </div>
  );
}
```

**Critical:** Client doesn't wait for generation - mutation returns instantly.

---

### 2. Server: Mutation (Entry Point)

**File:** `convex/chat.ts` (lines 15-191)

```typescript
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendMessage = mutation({
  handler: async (ctx, { conversationId, content, modelId }) => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Insert user message (complete immediately)
    await ctx.runMutation(internal.messages.create, {
      conversationId,
      userId: user._id,
      role: "user",
      content,
      status: "complete",
    });

    // 2. Insert assistant message (pending)
    const assistantMessageId = await ctx.runMutation(internal.messages.create, {
      conversationId,
      userId: user._id,
      role: "assistant",
      status: "pending", // ← Initial state
      model: modelId,
    });

    // 3. Schedule generation action (non-blocking)
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId,
      assistantMessageId,
      modelId,
      userId: user._id,
    });

    // 4. Return immediately (don't wait for generation)
    return { conversationId, messageId: assistantMessageId };
  },
});
```

**Key:** `ctx.scheduler.runAfter` schedules action but doesn't block mutation.

---

### 3. Server: Action (Long-Running)

**File:** `convex/generation.ts` (lines 366-600+)

```typescript
import { streamText } from "ai";
import { internalAction } from "./_generated/server";

export const generateResponse = internalAction({
  handler: async (ctx, { conversationId, assistantMessageId, modelId, userId }) => {
    const startTime = Date.now();

    try {
      // 1. Check if resumed after refresh
      const message = await ctx.runQuery(internal.messages.get, {
        messageId: assistantMessageId,
      });
      const wasGenerating = message?.status === "generating";
      const hasPartialContent = !!message?.partialContent;

      // 2. Mark generation started
      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: assistantMessageId,
        status: "generating", // ← State transition
        generationStartedAt: startTime,
      });

      // 3. Build context (messages, memories, system prompts)
      const conversationMessages = await ctx.runQuery(
        internal.messages.listForConversation,
        { conversationId }
      );

      // 4. Stream from LLM
      const result = streamText({
        model: getModel(modelId),
        messages: conversationMessages,
      });

      // 5. Accumulate and persist stream
      let buffer = "";
      let totalContent = "";
      const UPDATE_INTERVAL = 50; // chars

      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          buffer += chunk.textDelta;
          totalContent += chunk.textDelta;

          // Persist every 50 chars (resilient to refresh)
          if (buffer.length >= UPDATE_INTERVAL) {
            await ctx.runMutation(internal.messages.updatePartialContent, {
              messageId: assistantMessageId,
              partialContent: totalContent, // ← Client sees this
            });
            buffer = "";
          }
        }
      }

      // 6. Finalize (mark complete)
      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: assistantMessageId,
        status: "complete", // ← Final state
        content: totalContent,
        partialContent: "", // Clear partial
        generationCompletedAt: Date.now(),
        inputTokens,
        outputTokens,
        cost,
      });

      console.log(`Generation completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      // 7. Handle errors (mark error state)
      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: assistantMessageId,
        status: "error",
        error: error.message,
      });
      console.error("Generation failed:", error);
    }
  },
});
```

**Resilience:** Action runs up to 10 minutes. DB updates persist even if client disconnects.

---

## Debugging Checklist

### Symptom: Message Stuck "Pending"

**Diagnosis:**
1. Check action logs: `convex logs --function generation:generateResponse`
2. Did action start? Look for "Generation started" log
3. Did action error? Check error field in message

**Common Causes:**
- Action never scheduled (mutation error)
- Action hit 10min timeout (very long generation)
- LLM API error (check provider status)

**Fix:**
```typescript
// Check message in DB
const message = await ctx.db.get(messageId);
console.log("Status:", message.status);
console.log("Error:", message.error);
console.log("Started at:", message.generationStartedAt);
```

---

### Symptom: No Partial Content Updates

**Diagnosis:**
1. Is `partialContent` being written to DB?
2. Is client useQuery subscribed correctly?
3. Check UPDATE_INTERVAL (should be ~50 chars)

**Common Causes:**
- Forgot to call `updatePartialContent` in loop
- UPDATE_INTERVAL too high (only updates after 1000 chars)
- Client not subscribed to reactive query

**Fix:**
```typescript
// Verify updates in action
if (buffer.length >= 50) {
  await ctx.runMutation(internal.messages.updatePartialContent, {
    messageId: assistantMessageId,
    partialContent: totalContent,
  });
  console.log(`Updated partial: ${totalContent.length} chars`);
  buffer = "";
}
```

---

### Symptom: Status Not Updating to "Complete"

**Diagnosis:**
1. Did stream finish? Check for "Stream complete" log
2. Did final mutation run? Look for "Generation completed" log
3. Check if action errored before finalization

**Common Causes:**
- Stream never completes (LLM timeout)
- Error after stream but before final mutation
- Action timeout (10min limit)

**Fix:**
```typescript
// Add logging
for await (const chunk of result.fullStream) {
  // ...
}
console.log("Stream finished, finalizing...");

await ctx.runMutation(internal.messages.updateStatus, {
  messageId: assistantMessageId,
  status: "complete",
  content: totalContent,
});
console.log("Finalized successfully");
```

---

## Live References

When debugging resilient generation, skill will Read:

- `convex/chat.ts` - sendMessage mutation, action scheduling
- `convex/generation.ts` - generateResponse action, streaming loop
- `src/app/(main)/chat/[conversationId]/page.tsx` - Client subscription, UI updates

See `references/` for:
- `architecture-diagram.md` - ASCII flowchart with timestamps
- `status-transitions.md` - State machine with all transitions
- `trace-checklist.md` - Step-by-step debugging guide
- `debugging-playbook.md` - Symptom → solution mapping

## Quick Verification

Test resilient generation:

1. Send message → see "pending" status
2. Refresh page mid-generation → see partialContent continues
3. Close tab → action continues server-side
4. Reopen → see completed response

If any step fails, trace through architecture diagram.

## Common Pitfalls

1. **Client-only streaming** - Loses data on refresh
   - ❌ `const { text } = await streamText({ ... }); setText(text)`
   - ✅ Server action with DB persistence

2. **Blocking mutation** - Waits for generation (timeout)
   - ❌ `const response = await generateResponse(); return response`
   - ✅ `ctx.scheduler.runAfter(0, ...); return { messageId }`

3. **No partial updates** - User sees nothing until complete
   - ❌ Only update DB once at end
   - ✅ Update every ~50 chars during stream

4. **Missing error handling** - Message stuck "generating" forever
   - ❌ No try/catch in action
   - ✅ Always catch errors, mark status = "error"

5. **10min timeout** - Action killed mid-stream
   - Problem: Very long generation (20min+)
   - Solution: Chunk into smaller generations or use resumable pattern
