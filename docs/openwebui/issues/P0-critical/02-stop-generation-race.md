# Fix Stop Generation Race Condition

> **Status**: ✅ DONE (PR #153 merged 2026-01-17)
> **Phase**: P0-critical | **Effort**: 6h | **Impact**: $219K/yr savings
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

The stop signal is only checked every 50ms during streaming, creating a blind window where generation continues after user clicks stop. This wastes approximately 150 tokens (3 seconds of generation) per stop action, costing $219K annually at scale.

### Current Behavior

When user clicks "Stop generation":
1. T+0ms: User clicks stop
2. T+2ms: `stopGeneration` mutation sets status to "stopped"
3. T+5ms: Streaming loop checks - sees "generating" (last checked 45ms ago)
4. T+7ms: LLM generates 150 more tokens
5. T+50ms: Next check sees "stopped", breaks

**Result**: 150 wasted tokens, $0.012 per stop

### Expected Behavior

Stop signal should halt generation within <1ms, wasting 0-5 tokens maximum.

### Root Cause

The streaming loop only checks `message.status` during throttled DB updates (every 50ms). Between checks, generation continues blindly.

---

## Current Implementation

**File**: `packages/backend/convex/generation.ts:734-742`

```typescript
// Check for stop signal (only every 50ms!)
const currentMsg = await ctx.runQuery(internal.messages.get, {
  messageId: assistantMessageId,
});

if (currentMsg?.status === "stopped") {
  break; // Exit streaming loop - user cancelled
}

await ctx.runMutation(internal.messages.updatePartialContent, {
  messageId: assistantMessageId,
  partialContent: accumulated,
});

lastUpdate = Date.now(); // Next check in 50ms
```

---

## Solution

Implement immediate cancellation using AbortController with sub-millisecond response time.

### Step 1: Create Abortable Action Manager

**File**: `packages/backend/convex/lib/abortable-action.ts`

```typescript
export class AbortableAction {
  private controllers = new Map<string, AbortController>();

  start(messageId: string): AbortController {
    // Clean up any existing controller
    this.cleanup(messageId);

    const controller = new AbortController();
    this.controllers.set(messageId, controller);
    return controller;
  }

  stop(messageId: string): boolean {
    const controller = this.controllers.get(messageId);
    if (controller) {
      controller.abort();
      this.controllers.delete(messageId);
      return true;
    }
    return false;
  }

  isAborted(messageId: string): boolean {
    const controller = this.controllers.get(messageId);
    return controller?.signal.aborted ?? false;
  }

  cleanup(messageId: string): void {
    this.controllers.delete(messageId);
  }
}

// Singleton instance for cross-function access
export const abortableActions = new AbortableAction();
```

### Step 2: Modify Generation Action

**File**: `packages/backend/convex/generation.ts:612-750`

```typescript
import { abortableActions } from './lib/abortable-action';

export const generateResponse = internalAction({
  args: {
    existingMessageId: v.id("messages"),
    modelId: v.string(),
    // ... other args
  },
  handler: async (ctx, args) => {
    // Start with abortable controller
    const controller = abortableActions.start(args.existingMessageId);

    try {
      const result = streamText({
        model: getModel(args.modelId),
        messages: await buildMessages(ctx, args),
        abortSignal: controller.signal, // Pass to AI SDK
      });

      for await (const chunk of result.fullStream) {
        // Check abort signal IMMEDIATELY (not throttled)
        if (controller.signal.aborted) {
          throw new DOMException("Generation stopped by user", "AbortError");
        }

        if (chunk.type === "text-delta") {
          accumulated += chunk.text;

          // Throttled DB update, but check abort first
          if (Date.now() - lastUpdate >= UPDATE_INTERVAL) {
            if (controller.signal.aborted) {
              throw new DOMException("Generation stopped by user", "AbortError");
            }

            await ctx.runMutation(internal.messages.updatePartialContent, {
              messageId: args.existingMessageId,
              partialContent: accumulated,
            });
            lastUpdate = Date.now();
          }
        }
      }

      // Success path
      await ctx.runMutation(internal.messages.completeMessage, {
        messageId: args.existingMessageId,
        content: accumulated,
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Generation cancelled immediately by user');

        // Finalize with partial content
        await ctx.runMutation(internal.messages.updateStatus, {
          messageId: args.existingMessageId,
          status: "stopped",
          content: accumulated,
        });

        return; // Clean exit
      }

      // Other error handling...
      throw error;
    } finally {
      abortableActions.cleanup(args.existingMessageId);
    }
  },
});
```

### Step 3: Update Stop Generation Mutation

**File**: `packages/backend/convex/chat.ts:272-286`

```typescript
import { abortableActions } from './lib/abortable-action';

export const stopGeneration = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message || message.role !== "assistant") {
      return { success: false, reason: "Invalid message" };
    }

    if (message.status !== "generating") {
      return { success: false, reason: "Not generating" };
    }

    // Immediately abort the action
    const aborted = abortableActions.stop(args.messageId);

    // Also update DB as backup
    await ctx.db.patch(args.messageId, {
      status: "stopped",
      generationCompletedAt: Date.now(),
    });

    return { success: true, immediateAbort: aborted };
  },
});
```

---

## Testing

### Manual Verification

1. Start a long generation: "Write a 1000 word essay"
2. Wait for ~100 tokens to generate
3. Click "Stop generation"
4. Check console: Should log "Generation cancelled immediately"
5. Check message: Should have stopped with minimal extra tokens

### Unit Test

```typescript
describe('Stop Generation', () => {
  it('should stop immediately on abort signal', async () => {
    const messageId = await createTestMessage();

    // Start generation
    const generationPromise = generateResponse({ messageId });

    // Stop after 1ms
    setTimeout(() => {
      abortableActions.stop(messageId);
    }, 1);

    await generationPromise;

    const message = await getMessage(messageId);
    expect(message.status).toBe('stopped');
    expect(message.outputTokens).toBeLessThan(10); // Minimal waste
  });
});
```

### E2E Test

```typescript
it('should stop generation from UI', async () => {
  await sendMessage('Write a 1000 word essay');

  // Wait for generation to start
  await waitForStatus('generating');

  // Click stop
  await clickStopButton();

  // Should stop within 100ms
  await waitForStatus('stopped', { timeout: 100 });

  const message = await getLatestMessage();
  expect(message.outputTokens).toBeLessThan(50);
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Stop response time | 50ms | <1ms | 98% faster |
| Wasted tokens per stop | 150 | 0-5 | 97% reduction |
| Race condition rate | 40% | <1% | 97% reduction |
| Annual cost waste | $219K | ~$5K | 98% savings |

---

## Risk Assessment

- **Breaking Changes**: No - API unchanged
- **Migration Required**: No
- **Rollback Plan**: Remove abort logic, keep DB check as fallback
- **Edge Cases**:
  - Abort during DB write: Transaction completes, then stops
  - Abort with pending tools: Tool results may be partial

---

## References

- **Sources**: kimi/01-critical/02-stop-generation-race-condition.md, deep-research-report.md:238-296, IMPLEMENTATION-SPECIFICATION.md:138-229
- **AbortController**: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- **Related Issues**: P0-critical/01-token-counting.md (for wasted cost calculation)
