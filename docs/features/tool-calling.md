# Tool Calling: Technical Documentation

## Overview

blah.chat uses the Vercel AI SDK for tool calling, enabling the AI to execute functions during generation. The primary use case is the memory search tool that retrieves relevant context from the user's memory bank.

**Core Architecture**: Tools are created at runtime inside action handlers to capture Convex context via closure, then streamed results are persisted to enable real-time UI updates.

---

## Key Design Decisions

### 1. Runtime Tool Creation (Context Serialization)

**Problem**: AI SDK serializes tool execute functions across streaming boundaries. Closures over `ActionCtx` fail.

**Solution**: Create tools at runtime inside the action handler.

```typescript
// CORRECT - Tool created at runtime, ctx captured via closure
export function createMemorySearchTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    inputSchema: z.object({
      query: z.string(),
      // ...
    }),
    execute: async (input) => {
      // ctx accessible here because tool was created inside action scope
      return await ctx.runAction(internal.memories.search.hybridSearch, {...});
    },
  });
}

// In your action handler
const memoryTool = createMemorySearchTool(ctx, userId);
streamText({ tools: { searchMemories: memoryTool } });
```

**Key**: Never define tools at module level with closures over Convex context.

---

### 2. Multi-Step Tool Calling with `stopWhen`

**Critical**: AI SDK v5 uses `stopWhen`, NOT `maxSteps` for multi-step tool execution.

```typescript
import { streamText, stepCountIs } from "ai";

const result = streamText({
  model,
  messages,
  tools: { searchMemories: memoryTool },
  stopWhen: stepCountIs(5), // Continue until 5 steps OR no more tool calls
});
```

**Why `stopWhen` matters**:
- `maxSteps` may not trigger continuation after tool execution with some providers
- `stopWhen: stepCountIs(N)` explicitly enables the multi-step loop
- The SDK executes tools, sends results back to model, and continues until stopping condition

**Debugging tip**: Log finish reason and step count:
```typescript
const steps = await result.steps;
console.log("Steps:", steps.length, "Finish:", await result.finishReason);
```

---

### 3. Tool Result Property Naming

**Gotcha**: AI SDK v5 uses different property names at different stages.

**Streaming chunks** (`tool-result` chunk):
```typescript
if (chunk.type === "tool-result") {
  const resultValue = (chunk as any).result ?? (chunk as any).output;
  // Use fallback because SDK may use either property
}
```

**Completed steps** (in `result.steps`):
```typescript
const stepResult = step.toolResults.find(tr => tr.toolCallId === tc.toolCallId);
const result = stepResult.result ?? stepResult.output; // Fallback
```

---

### 4. Real-Time Tool Call UI

**Architecture**: Three-phase flow for transparent tool execution.

1. **Tool invoked**: Capture `tool-call` chunk → save to `partialToolCalls` → show spinner
2. **Tool executing**: Result arrives via `tool-result` → update `partialToolCalls` with result
3. **Message complete**: Migrate final `toolCalls` array → clear `partialToolCalls`

**Schema fields**:
```typescript
// messages table
partialToolCalls: v.optional(v.array(v.object({
  id: v.string(),
  name: v.string(),
  arguments: v.string(),
  result: v.optional(v.string()),
  timestamp: v.number(),
}))),
toolCalls: v.optional(v.array(v.object({
  id: v.string(),
  name: v.string(),
  arguments: v.string(),
  result: v.optional(v.string()),
  timestamp: v.number(),
}))),
```

**Deduplication**: Merge partial + complete calls by ID, completed overwrites partial.

---

## Key Files

| File | Responsibility |
|------|---------------|
| `convex/ai/tools/memories.ts` | Tool definition with context closure pattern |
| `convex/generation.ts` | streamText options, chunk handling, tool result persistence |
| `convex/messages.ts` | `updatePartialToolCalls`, `completeMessage` mutations |
| `src/components/chat/ToolCallDisplay.tsx` | UI component with loading states |
| `src/components/chat/ChatMessage.tsx` | Renders tool calls, passes to ToolCallDisplay |

---

## Critical Gotchas

### 1. Context Serialization Failure

**Error**: Message generation hangs indefinitely.

**Cause**: Tool with closure over `ActionCtx` defined at module level.

**Fix**: Create tool inside action handler using factory function.

### 2. Single Step Despite `maxSteps`

**Error**: Tool executes but model doesn't generate text response.

**Cause**: Using `maxSteps` instead of `stopWhen`.

**Fix**: `stopWhen: stepCountIs(5)` with import from `ai`.

### 3. Tool Result Missing

**Error**: UI shows RUNNING even after tool completes.

**Cause**: Accessing wrong property (`chunk.result` vs `chunk.output`).

**Fix**: Use fallback pattern `chunk.result ?? chunk.output`.

### 4. Memoization Blocking UI Updates

**Error**: Tool completes in DB but UI doesn't update.

**Cause**: `React.memo` comparison function doesn't include `toolCalls`/`partialToolCalls`.

**Fix**: Add these fields to memo comparison.

---

## Testing Checklist

1. **Tool executes**: Send message triggering tool → see spinner → see results
2. **Multi-step works**: Tool finishes → model generates text response (Steps: 2+)
3. **UI persists**: Page refresh mid-tool → loading state persists → completes
4. **Fallback**: Tool errors gracefully → chat continues without crashing

---

## Future Enhancements

- **Multiple tools**: Add web search, calculator, code execution
- **Tool streaming**: Stream partial tool results for long-running operations
- **Tool confirmation**: User approval before executing sensitive tools
- **Tool history**: Track all tool calls per conversation

---

## Summary

Tool calling in blah.chat uses:
- **Runtime tool creation** to capture Convex context
- **`stopWhen: stepCountIs(N)`** for multi-step execution
- **Fallback property access** for SDK compatibility
- **Three-phase UI flow** for transparent execution

Key files: `convex/ai/tools/memories.ts`, `convex/generation.ts`, `ToolCallDisplay.tsx`.
