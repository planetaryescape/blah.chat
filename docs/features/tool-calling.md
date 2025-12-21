# Tool Calling System

LLM tool calling for blah.chat. Gives the AI capabilities beyond text generation.

---

## Architecture

```
generation.ts
  └── streamText({ tools: { ... } })
        └── createXxxTool(ctx, userId)  // Factory functions
              └── tool({ description, inputSchema, execute })
                    └── ctx.runAction(internal.tools.xxx)  // Backend if needed
```

**Core Principle**: Tools MUST be created via factory functions inside the action handler. Defining tools at module level causes closures over `ActionCtx` to fail during streaming serialization.

---

## Critical Pattern: Runtime Tool Creation

**Problem**: AI SDK serializes tool execute functions across streaming boundaries. Closures over `ActionCtx` fail.

**Solution**: Create tools at runtime inside the action handler.

```typescript
// WRONG - will hang/fail
const myTool = tool({
  execute: async () => {
    await ctx.runAction(...); // ctx not serializable
  },
});

// CORRECT - Tool created at runtime, ctx captured via closure
export function createMemorySearchTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    inputSchema: z.object({
      query: z.string(),
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

## Multi-Step Tool Calling

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

## Tool Categories

### Local Execution (No Backend)
- **Calculator** - mathjs for precision arithmetic
- **DateTime** - date-fns for time/calendar operations

No `ctx.runAction` needed. Execute directly in the tool.

### Backend Action Required
- **Web Search** - Tavily API (recommended) or alternatives
- **URL Reader** - Jina Reader (free tier) or Firecrawl
- **Code Execution** - E2B sandboxes (recommended) or Pyodide
- **Memory Search/Save** - existing RAG infrastructure
- **Project Context** - queries existing projects system

Requires `ctx.runAction(internal.tools.xxx)` to access DB/external APIs.

---

## Implemented Tools

| Tool | Status | Backend | External API |
|------|--------|---------|--------------|
| searchMemories | Done | Yes | None |
| saveMemory | Done | Yes | None |
| calculator | Planned | No | None |
| datetime | Planned | No | None |
| webSearch | Planned | Yes | Tavily |
| urlReader | Planned | Yes | Jina |
| codeExecution | Planned | Yes | E2B |
| projectContext | Planned | Yes | None |
| fileDocument | Future | Yes | None |

---

## Real-Time Tool Call UI

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

## Tool Result Property Naming

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

## Tool Description Best Practices

LLMs decide when to call tools based on description. Be explicit:

```typescript
description: `Search the web for current information.

✅ USE FOR:
- Current events, news, prices
- Recent documentation or release notes
- Fact-checking claims

❌ DO NOT USE FOR:
- Information from training data
- User preferences (use memory tool)
- Code generation

Returns top 5 results with titles, snippets, URLs.`
```

Pattern: Tell the LLM WHEN to use it and WHEN NOT to use it.

---

## Error Handling

Never throw from tool execute. Return structured errors:

```typescript
execute: async (input) => {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    console.error("[Tool] Failed:", error);
    return { success: false, error: error.message };
  }
}
```

LLM can then explain the error to user gracefully.

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

## UI Display

Each tool needs entries in `ToolCallDisplay.tsx`:
- Icon (from lucide-react)
- Running state label ("Searching...")
- Complete state label ("Found 5 results")
- Optional expanded view for details

---

## Adding a New Tool

1. Create factory in `convex/ai/tools/your-tool.ts`
2. Create backend action in `convex/tools/yourTool.ts` (if needed)
3. Register in `convex/generation.ts` inside `options.tools`
4. Update `ToolCallDisplay.tsx` for UI
5. Add env vars if external API

---

## External API Recommendations

### Web Search
**Tavily** (recommended) - Built for AI, returns content not just links
- Free: 1,000/mo
- Returns comprehensive content with citations
- Alternative: Brave Search for independent index

### URL Reading
**Jina Reader** (recommended) - Free, no API key required
- Just prepend `https://r.jina.ai/` to URL
- Returns clean markdown
- Handles JS-rendered pages
- Alternative: Firecrawl for enterprise features

### Code Execution
**E2B** (recommended) - Secure sandboxed code execution
- Firecracker microVMs (AWS Lambda tech)
- ~150ms spin-up
- Python & JS support
- Alternative: Pyodide for free WASM-based Python

---

## Environment Variables

```bash
# Web Search
TAVILY_API_KEY=tvly-...

# URL Reading (optional, increases rate limit)
JINA_API_KEY=jina_...

# Code Execution
E2B_API_KEY=e2b_...
```

---

## Testing Checklist

1. **Tool executes**: Send message triggering tool → see spinner → see results
2. **Multi-step works**: Tool finishes → model generates text response (Steps: 2+)
3. **UI persists**: Page refresh mid-tool → loading state persists → completes
4. **Fallback**: Tool errors gracefully → chat continues without crashing

---

## TypeScript Note

Use `@ts-ignore` on execute function due to Convex + AI SDK type depth issues:

```typescript
// @ts-ignore - Convex + AI SDK type depth issues
execute: async (input) => { ... }
```

---

## Key Files

| File | Responsibility |
|------|---------------|
| `convex/ai/tools/*.ts` | Tool factory functions |
| `convex/tools/*.ts` | Backend actions for tools |
| `convex/generation.ts` | Tool registration, chunk handling |
| `convex/messages.ts` | `updatePartialToolCalls`, `completeMessage` |
| `src/components/chat/ToolCallDisplay.tsx` | UI component with loading states |
| `src/components/chat/ChatMessage.tsx` | Renders tool calls |
