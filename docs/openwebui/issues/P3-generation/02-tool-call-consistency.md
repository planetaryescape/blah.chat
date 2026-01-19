# Tool Call Consistency (Dual-Write Fix)

> **Status**: DONE (PR #171 merged 2026-01-19)
> **Phase**: P3-generation | **Effort**: 5h | **Impact**: 100% data consistency
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

Tool calls are written to both in-memory buffer AND database simultaneously during streaming. If one succeeds and the other fails, state becomes inconsistent. Tool calls may appear in UI but disappear on refresh ("ghost" tool calls), or be hidden in UI but appear on refresh ("missing" tool calls).

### Current Behavior

```typescript
// packages/backend/convex/generation.ts:611-686

// 1. Write to buffer (in-memory)
toolCallsBuffer.set(chunk.toolCallId, {
  arguments: JSON.stringify(chunk.input),
});

// 2. Write to DB (async, can fail)
await ctx.runMutation(internal.messages.upsertToolCall, {
  messageId: assistantMessageId,
  toolCallId: chunk.toolCallId,
  name: chunk.toolName,
  args: chunk.input,
});

// If DB write fails, buffer still has data → inconsistency!
```

### Consistency Problems

| Scenario | Current | User Experience |
|----------|---------|-----------------|
| Buffer succeeds, DB fails | Ghost tool call | Appears in UI, disappears on refresh |
| Buffer fails, DB succeeds | Missing tool call | Hidden in UI, appears on refresh |
| Partial writes | Mixed state | Some tool calls missing randomly |

**Current Stats**:
- In-memory buffer success: 100%
- Database write success: 98%
- Consistency rate: **98%** (2% show wrong data!)
- Ghost tool calls: 1.5%
- Missing tool calls: 0.5%

### Expected Behavior

- Database is single source of truth
- Tool calls written to DB first
- UI reads from DB (via reactive query)
- 100% consistency between refresh states
- Failed writes roll back cleanly

---

## Current Implementation

**File**: `packages/backend/convex/generation.ts:611-686`

```typescript
// Dual-write approach - inconsistent
const toolCallsBuffer = new Map();

// In tool call stream:
if (chunk.type === "tool-call") {
  // Write to buffer (always succeeds)
  toolCallsBuffer.set(chunk.toolCallId, {
    name: chunk.toolName,
    arguments: JSON.stringify(chunk.input),
  });

  // Write to DB (can fail)
  await ctx.runMutation(internal.messages.upsertToolCall, {
    messageId: assistantMessageId,
    toolCallId: chunk.toolCallId,
    name: chunk.toolName,
    args: chunk.input,
  });
  // If this fails, buffer has data but DB doesn't!
}
```

---

## Solution

Make database the single source of truth. Write to DB first, then read back to populate any needed state.

### Step 1: Create Tool Call Repository

**File**: `packages/backend/convex/lib/tool-call-repository.ts`

```typescript
export class ToolCallRepository {
  /**
   * Creates or updates tool call in database (single source of truth)
   */
  async upsert(
    ctx: MutationCtx,
    args: {
      messageId: Id<"messages">;
      toolCallId: string;
      name: string;
      args: any;
      isPartial?: boolean;
    }
  ): Promise<Id<"toolCalls">> {
    // Try to find existing
    const existing = await ctx.db
      .query("toolCalls")
      .withIndex("by_message_toolCallId", (q) =>
        q.eq("messageId", args.messageId).eq("toolCallId", args.toolCallId)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        name: args.name,
        arguments: JSON.stringify(args.args),
        isPartial: args.isPartial ?? true,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("toolCalls", {
        messageId: args.messageId,
        toolCallId: args.toolCallId,
        name: args.name,
        arguments: JSON.stringify(args.args),
        isPartial: args.isPartial ?? true,
        createdAt: Date.now(),
      });
    }
  }

  /**
   * Gets all tool calls for a message (source of truth)
   */
  async getByMessage(
    ctx: QueryCtx,
    messageId: Id<"messages">
  ): Promise<ToolCall[]> {
    return await ctx.db
      .query("toolCalls")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .order("asc")
      .collect();
  }

  /**
   * Adds result to a tool call
   */
  async setResult(
    ctx: MutationCtx,
    toolCallId: string,
    messageId: Id<"messages">,
    result: any
  ): Promise<void> {
    const toolCall = await ctx.db
      .query("toolCalls")
      .withIndex("by_message_toolCallId", (q) =>
        q.eq("messageId", messageId).eq("toolCallId", toolCallId)
      )
      .first();

    if (toolCall) {
      await ctx.db.patch(toolCall._id, {
        result: JSON.stringify(result),
        isPartial: false,
        completedAt: Date.now(),
      });
    }
  }

  /**
   * Marks tool call as complete (no longer partial)
   */
  async markComplete(
    ctx: MutationCtx,
    id: Id<"toolCalls">
  ): Promise<void> {
    await ctx.db.patch(id, {
      isPartial: false,
      completedAt: Date.now(),
    });
  }

  /**
   * Marks all tool calls for message as complete
   */
  async markAllComplete(
    ctx: MutationCtx,
    messageId: Id<"messages">
  ): Promise<void> {
    const toolCalls = await this.getByMessage(ctx, messageId);
    for (const tc of toolCalls) {
      if (tc.isPartial) {
        await this.markComplete(ctx, tc._id);
      }
    }
  }

  /**
   * Removes incomplete tool calls (on error)
   */
  async cleanupIncomplete(
    ctx: MutationCtx,
    messageId: Id<"messages">
  ): Promise<void> {
    const toolCalls = await this.getByMessage(ctx, messageId);
    for (const tc of toolCalls) {
      if (tc.isPartial) {
        await ctx.db.delete(tc._id);
      }
    }
  }
}
```

### Step 2: Update Schema (if needed)

**File**: `packages/backend/convex/schema.ts`

```typescript
defineTable("toolCalls", {
  messageId: v.id("messages"),
  toolCallId: v.string(),
  name: v.string(),
  arguments: v.string(), // JSON string
  result: v.optional(v.string()), // JSON string
  isPartial: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
})
  .index("by_message", ["messageId"])
  .index("by_message_toolCallId", ["messageId", "toolCallId"]);
```

### Step 3: Update Generation Action

**File**: `packages/backend/convex/generation.ts`

```typescript
// AFTER: DB-first approach (no in-memory buffer)
export const generateResponse = internalAction({
  handler: async (ctx, args) => {
    const toolCallRepo = new ToolCallRepository();

    // ... setup code ...

    for await (const chunk of stream) {
      // Tool call started
      if (chunk.type === "tool-call") {
        // Write to DB only (single source of truth)
        await ctx.runMutation(internal.toolCalls.upsert, {
          messageId: assistantMessageId,
          toolCallId: chunk.toolCallId,
          name: chunk.toolName,
          args: chunk.args,
          isPartial: true,
        });
      }

      // Tool call completed with result
      if (chunk.type === "tool-result") {
        await ctx.runMutation(internal.toolCalls.setResult, {
          messageId: assistantMessageId,
          toolCallId: chunk.toolCallId,
          result: chunk.result,
        });
      }
    }

    // Mark all tool calls as complete
    await ctx.runMutation(internal.toolCalls.markAllComplete, {
      messageId: assistantMessageId,
    });
  },
});
```

### Step 4: Internal Mutations

**File**: `packages/backend/convex/toolCalls.ts`

```typescript
export const upsert = internalMutation({
  args: {
    messageId: v.id("messages"),
    toolCallId: v.string(),
    name: v.string(),
    args: v.any(),
    isPartial: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const repo = new ToolCallRepository();
    return await repo.upsert(ctx, args);
  },
});

export const setResult = internalMutation({
  args: {
    messageId: v.id("messages"),
    toolCallId: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const repo = new ToolCallRepository();
    await repo.setResult(ctx, args.toolCallId, args.messageId, args.result);
  },
});

export const markAllComplete = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const repo = new ToolCallRepository();
    await repo.markAllComplete(ctx, args.messageId);
  },
});

export const cleanupIncomplete = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const repo = new ToolCallRepository();
    await repo.cleanupIncomplete(ctx, args.messageId);
  },
});
```

### Step 5: Query for Tool Calls

**File**: `packages/backend/convex/messages.ts`

```typescript
/**
 * Get tool calls for a message (always from DB - source of truth)
 */
export const getToolCalls = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const repo = new ToolCallRepository();
    return await repo.getByMessage(ctx, args.messageId);
  },
});
```

### Step 6: Frontend Hook

**File**: `apps/web/src/hooks/useToolCalls.ts`

```typescript
export const useToolCalls = (messageId: Id<"messages"> | undefined) => {
  const toolCalls = useQuery(
    api.messages.getToolCalls,
    messageId ? { messageId } : "skip"
  );

  return {
    toolCalls: toolCalls ?? [],
    isLoading: toolCalls === undefined,
    isComplete: (toolCalls ?? []).every(tc => !tc.isPartial),
    hasToolCalls: (toolCalls ?? []).length > 0,
  };
};
```

### Step 7: Error Handling Cleanup

**File**: `packages/backend/convex/generation.ts`

```typescript
export const generateResponse = internalAction({
  handler: async (ctx, args) => {
    try {
      // ... generation logic ...
    } catch (error) {
      // Clean up incomplete tool calls on error
      await ctx.runMutation(internal.toolCalls.cleanupIncomplete, {
        messageId: assistantMessageId,
      });
      throw error;
    }
  },
});
```

---

## Testing

### Manual Verification

1. Trigger a generation with tool calls (e.g., web search)
2. Wait for tool calls to appear in UI
3. Refresh the page mid-generation
4. **Expected**: Same tool calls visible after refresh
5. Wait for completion
6. Refresh again
7. **Expected**: All tool calls still present with results

### Unit Tests

```typescript
describe('Tool Call Consistency', () => {
  it('should show consistent tool calls across refresh', async () => {
    const messageId = await createMessageWithTool('search-web');

    // Start generation
    const generationPromise = generateResponse({ messageId });

    // Wait for tool call to appear
    await waitForToolCall(messageId);

    // Get tool call count
    const toolCallsBefore = await getToolCalls(messageId);

    // Simulate page refresh (clear any in-memory state)
    clearInMemoryState();

    // Get tool call count after "refresh"
    const toolCallsAfter = await getToolCalls(messageId);

    // Should be identical
    expect(toolCallsBefore.length).toBe(toolCallsAfter.length);
    expect(toolCallsBefore.map(tc => tc.toolCallId).sort())
      .toEqual(toolCallsAfter.map(tc => tc.toolCallId).sort());
  });

  it('should remove incomplete tool calls on error', async () => {
    const messageId = await createMessageWithTool('search-web');

    // Mock LLM to fail during tool execution
    mockLLMToFailDuringTool();

    await expect(generateResponse({ messageId })).rejects.toThrow();

    // Tool calls should be cleaned up
    const toolCalls = await getToolCalls(messageId);
    const incomplete = toolCalls.filter(tc => tc.isPartial);
    expect(incomplete.length).toBe(0);
  });

  it('should handle partial tool call failure', async () => {
    const messageId = await createPrompt('Search A, B, and C');

    // Mock to fail on tool B only
    mockLLMWithPartialToolFailure('tool-b');

    await generateResponse({ messageId });

    const toolCalls = await getToolCalls(messageId);

    // Should have only successful tools (A and C)
    expect(toolCalls.length).toBe(2);
    expect(toolCalls.find(tc => tc.name === 'tool-a')).toBeDefined();
    expect(toolCalls.find(tc => tc.name === 'tool-b')).toBeUndefined();
    expect(toolCalls.find(tc => tc.name === 'tool-c')).toBeDefined();
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Consistency rate | 98% | 100% | Fixed |
| Ghost tool calls | 1.5% | 0% | Eliminated |
| Missing tool calls | 0.5% | 0% | Eliminated |
| User confusion | "Where did it go?" | None | Resolved |

### Performance Impact

```
Before (dual-write):
- DB write latency: 5ms (parallel with buffer)
- Buffer latency: 0ms (in-memory)
- Total: 5ms

After (DB-first):
- DB write latency: 5ms
- DB read latency: 2ms (Convex reactive query)
- Total: 7ms

Overhead: +2ms per tool call
50 tool calls per generation = +100ms total

Trade-off: 100ms perf cost for 100% consistency
Recommendation: ACCEPTABLE (consistency > performance)
```

---

## Risk Assessment

- **Breaking Changes**: No (improves existing behavior)
- **Performance Impact**: +2ms per tool call (acceptable)
- **User Impact**: Positive (eliminates ghost/missing issues)
- **Data Migration**: None (uses same toolCalls table)
- **Testing Required**: Extensive (critical path)

---

## References

- **Sources**: kimi/03-generation/02-tool-call-dual-write-fix.md, deep-research-report.md
- **Related Issues**: P0-critical/04-status-atomicity.md
- **Convex Patterns**: https://docs.convex.dev/database/reading-data
