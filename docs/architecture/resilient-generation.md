# Resilient Generation

**Status**: Core Architecture
**Last Updated**: December 2025

---

## Overview

Resilient generation is blah.chat's core architectural pattern that ensures AI responses **survive page refresh, tab close, and browser crashes**. Unlike typical AI chat apps that lose responses when the connection drops, blah.chat persists every generation server-side.

**Key Guarantee**: User closes tab mid-generation → action continues server-side → user reopens → sees completed response.

---

## Why This Matters

**Standard AI chat apps** use client-side streaming (like `useChat()` hook):
- Response lives in browser memory
- User refreshes → response is lost
- Network hiccup → generation fails
- No way to recover mid-generation responses

**blah.chat's approach** uses Convex server-side actions:
- Response persisted to database
- Generation runs up to 10 minutes server-side
- Client subscribes via reactive query
- Resume from any device, any time

---

## Architecture

### Flow Diagram

```
1. User sends message
   ↓
2. Mutation creates pending assistant message in DB
   ↓
3. ctx.scheduler.runAfter(0, generateResponse) schedules action
   ↓
4. Action streams from LLM, updates partialContent every ~200ms
   ↓
5. Client query reactively updates UI
   ↓
6. On refresh: query fetches current state, sees completed/partial content
```

### Message States

```typescript
type MessageStatus = "pending" | "generating" | "complete" | "error"
```

- **pending**: Message created, generation not started
- **generating**: Action running, `partialContent` updating
- **complete**: Generation finished, final `content` stored
- **error**: Generation failed, error message stored

### Key Database Fields

```typescript
messages: defineTable({
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error")
  ),
  content: v.string(),                    // Final content
  partialContent: v.optional(v.string()), // Streaming accumulator
  error: v.optional(v.string()),          // Error message if failed
  generationStartedAt: v.optional(v.number()),
  generationCompletedAt: v.optional(v.number()),
})
```

---

## Implementation

### Generation Action

```typescript
// convex/generation.ts
export const generateResponse = internalAction({
  args: { messageId: v.id("messages"), ... },
  handler: async (ctx, args) => {
    // Mark as generating
    await ctx.runMutation(internal.messages.markGenerating, {
      messageId: args.messageId,
    });

    let accumulated = "";
    let lastUpdate = Date.now();

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        accumulated += chunk.text;

        // Throttled updates (200ms)
        if (Date.now() - lastUpdate >= 200) {
          await ctx.runMutation(internal.messages.updatePartialContent, {
            messageId: args.messageId,
            partialContent: accumulated,
          });
          lastUpdate = Date.now();
        }
      }
    }

    // Mark complete with final content
    await ctx.runMutation(internal.messages.completeMessage, {
      messageId: args.messageId,
      content: accumulated,
      // ... tokens, cost, etc.
    });
  },
});
```

### Client Subscription

```typescript
// React component
const message = useQuery(api.messages.get, { messageId });

// Automatically updates when partialContent or content changes
// No manual polling or refetching needed
```

---

## Why Convex Actions (Not Client Streaming)

| Aspect | Client-Side (useChat) | Server-Side (Convex Actions) |
|--------|----------------------|------------------------------|
| Timeout | 60s (Vercel Edge) | 10 minutes |
| Survives refresh | No | Yes |
| Multi-device resume | No | Yes |
| Token tracking | Trust client | Server-side capture |
| Cost accuracy | Unreliable | Guaranteed |

**Key insight**: Convex actions are serverless functions that persist state. Unlike Vercel Edge (60s timeout), actions run until completion (10min max).

---

## Why Not Vercel AI Elements

Evaluated for UI patterns but incompatible with resilient generation:
- AI Elements uses client-side state management
- Cannot survive page refresh (fails our core requirement)
- We use it as **design inspiration only**: action toolbars, loading animations, input UX

---

## Testing Resilient Generation

### Manual Test

1. Send "Write a long story about a dragon" (triggers long generation)
2. Wait 2-3 seconds for generation to start
3. Close browser tab completely
4. Reopen the conversation
5. **Expected**: Response is complete or still generating (not lost)

### Automated Checks

- [ ] Message state transitions: `pending` → `generating` → `complete`
- [ ] partialContent updates during generation (check DB timestamps)
- [ ] Final content matches accumulated partialContent
- [ ] Token counts and cost recorded
- [ ] Error state handled gracefully (with retry option)

---

## Edge Cases

### Long Generations (>5 minutes)
Convex actions support up to 10 minutes. For extremely long generations:
- Consider chunking responses
- Implement progress indicators
- Warn users about expected duration

### Network Errors Mid-Generation
- Action continues server-side regardless
- Client reconnects and sees current state
- No data loss

### Concurrent Edits
- Each message has its own generation action
- No race conditions between messages
- Database ensures consistency

---

## Performance Considerations

### Throttled Updates (200ms)
- Prevents database write spam
- Balances real-time feel with server load
- Configurable per use case

### Reactive Queries
- Client subscribes once, receives all updates
- No polling overhead
- Automatic cleanup on unmount

---

## Related Documentation

- [Testing: Resilient Generation Manual](../testing/resilient-generation-manual.md) - Full test checklist
- [API Architecture](./api-hybrid.md) - How this fits with REST API
- [Implementation Rollup](../implementation/rollup.md) - Design decisions
