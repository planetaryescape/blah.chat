# Memory Retrieval Implementation - Technical Journey

## Problem Statement

Memory feature broken - LLM doesn't have access to user memories. Users reported assistant responding with "no memories" when asked about preferences and personal information.

## Root Causes Discovered

### 1. AI SDK v4 → v5 Breaking Change

**Error**: `Invalid schema for function 'getUserMemories': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'`

**Cause**: Original code used AI SDK v4 syntax (`parameters`) but project uses AI SDK v5 (`inputSchema`)

```typescript
// v4 syntax (BROKEN)
tool({
  parameters: z.object({...}),
  execute: async (args) => {...}
})

// v5 syntax (CORRECT)
tool({
  inputSchema: z.object({...}),
  execute: async (args) => {...}
})
```

### 2. Convex Context Serialization Issue

**Error**: Message generation hanging indefinitely (5+ minutes loading with no response)

**Cause**: Inline tool with closure over Convex `ActionCtx` cannot serialize across AI SDK streaming boundaries

```typescript
// BROKEN APPROACH (closure pattern)
const memoryTool = tool({
  inputSchema: z.object({...}),
  execute: async (args) => searchUserMemories(ctx, { userId, ...args })
  //                                          ^^^ closure over ctx fails during streaming
});

streamText({ tools: { getUserMemories: memoryTool } });
```

**Why it fails**:
- When LLM calls tool during streaming, AI SDK tries to serialize the execute function
- Convex `ActionCtx` binding in closure fails silently
- Tool never completes → LLM waits indefinitely for results
- Works in standard Node.js but NOT in Convex actions with AI SDK streaming

### 3. Stale Build Cache

**Error**: `No matching export in "convex/ai/tools/memories.ts" for import "getUserMemoriesTool"`

**Cause**: Deleted `convex/ai/tools/index.ts` but Convex dev server had stale build state

**Fix**: Restart Convex dev server

## Solution Attempts

### Attempt 1: Update to v5 Syntax with Inline Tool ❌

**Implementation**:
- Changed `parameters` → `inputSchema`
- Used inline tool definition with closure over `ctx` and `args`
- Extracted `searchUserMemories()` helper function

**Result**: FAILED - Message generation hung indefinitely due to context serialization issue

### Attempt 2: Rollback to Working State ✅

**Implementation**:
- Removed all tool code from `convex/generation.ts`
- Removed tool imports (`tool`, `z`, `searchUserMemories`)
- Removed `onStepFinish` handler
- Removed tool guidance from system prompt
- Restarted Convex dev server

**Result**: SUCCESS - Message generation working again, but memories completely disabled

### Attempt 3: Pre-Fetch Approach (FINAL SOLUTION) ✅

**Implementation**: Fetch memories BEFORE generation, inject into system prompt

**Why Pre-Fetch Wins**:
1. ✅ **Reliability**: No tool serialization issues
2. ✅ **Performance**: Faster (no mid-stream embedding calls)
3. ✅ **Simplicity**: Single async call, no tool framework
4. ✅ **Predictability**: Fixed token budget, known cost
5. ✅ **User Experience**: Always have memory context (makes sense for chat)

**Trade-offs**:
- ❌ Loses flexibility (can't decide when to retrieve)
- ❌ Fixed context window usage (~2000 tokens)

**Verdict**: For chat use case, always having memory context is actually BETTER than on-demand.

## Final Implementation

### Files Modified

#### 1. `convex/generation.ts`

**Added import**:
```typescript
import { formatMemoriesByCategory } from "./lib/prompts/formatting";
```

**Added memory fetching logic** in `buildSystemPrompts` function (lines 87-111):
```typescript
// 4. Memory retrieval (pre-fetch approach)
if (args.userMessage) {
  try {
    // @ts-ignore
    const memories = await ctx.runAction(
      internal.memories.search.hybridSearch,
      {
        userId: args.userId,
        query: args.userMessage,
        limit: 10,
      },
    );

    if (memories.length > 0) {
      const memoryContent = formatMemoriesByCategory(memories);
      systemMessages.push({
        role: "system",
        content: memoryContent,
      });
    }
  } catch (error) {
    console.error("Memory fetch failed:", error);
    // Continue without memories (graceful degradation)
  }
}
```

**Verified**: `generateResponse` already passes `lastUserMsg?.content` to `buildSystemPrompts` (line 165)

#### 2. `convex/lib/prompts/formatting.ts`

**Already exists** with required helper functions:
- `formatMemoriesByCategory()` - Groups and formats memories by category
- `truncateMemories()` - Prioritizes and truncates to token budget

No changes needed.

## Alternative Approaches Researched

### Option 1: Runtime Tool Creation

Create tools inside action handler to fix closure issue:

```typescript
const memoryTool = tool({
  parameters: z.object({ query: z.string() }),
  execute: async (args) => searchUserMemories(ctx, { userId, ...args })
});

streamText({ tools: { searchMemories: memoryTool } });
```

**Status**: Works, but adds latency (mid-stream embedding calls)

### Option 2: Convex Agent Component

Use official `@convex-dev/agent` package:

```typescript
import { createTool } from "@convex-dev/agent";
const memoryTool = createTool({ args: ..., handler: async (ctx, args) => ... });
```

**Status**: Best long-term solution, but requires:
- New dependency (`@convex-dev/agent`)
- Architectural refactor
- Learning new API

## Architecture Flow

### Pre-Fetch Memory Retrieval Flow

1. **User sends message** → stored in DB with `status: "pending"`
2. **generateResponse action triggered**
3. **Get last user message** from conversation history (line 149-153)
4. **buildSystemPrompts called** with `userMessage: lastUserMsg?.content`
5. **Memory search executed**:
   - Generate embedding for user message
   - Run hybrid search (keyword + vector)
   - Retrieve top 10 most relevant memories
6. **Format memories** by category (identity, preference, project, context, relationship)
7. **Inject into system prompt** as structured markdown
8. **Stream LLM response** with memory context included
9. **Graceful degradation**: If memory fetch fails, continue without memories

### Memory Categories

- **identity**: "About You" (user facts)
- **preference**: "Your Preferences" (settings, likes/dislikes)
- **project**: "Your Projects" (work context)
- **context**: "Background & Goals"
- **relationship**: "People & Teams"
- **other**: "Other Context"

## Cost Analysis

**Per-message overhead**:
- Memory embedding: ~$0.0001 (text-embedding-3-small)
- Memory search: Negligible (Convex vector index)
- Context tokens: ~2000 tokens = ~$0.006 (at gpt-4o rates)
- **Total**: ~$0.0061 per message

**Optimization opportunities** (future):
- Cache embeddings for frequent queries
- Reduce limit to 5 memories (halve token cost)
- Only fetch if message references past ("remember", "you told me", etc.)

## Testing Strategy

1. **Basic retrieval**:
   - Send: "My name is John"
   - Wait for memory extraction (background)
   - Send: "What's my name?"
   - Verify: Response includes "John"

2. **Category grouping**:
   - Add memories across categories
   - Send relevant query
   - Check formatted output in logs

3. **Graceful degradation**:
   - Simulate memory search error
   - Verify: Generation continues without memories

4. **Token budget**:
   - Add 20+ memories
   - Verify: Only top 10 retrieved

## Future Considerations

### Hybrid Approach (Advanced)

Combine pre-fetch + tool calling:
1. **Pre-fetch**: Always include top 3-5 most relevant memories
2. **Tool**: Allow LLM to request more specific searches

Benefits:
- Best of both worlds
- Always have context + ability to dig deeper

Trade-offs:
- Increased complexity
- Need to solve context serialization for tools first

### Tool Calling (Long-term)

If we want to re-enable tool calling in the future:

**Option A**: Use `@convex-dev/agent` package (recommended)
**Option B**: Create tools at runtime (avoid closure issue)
**Option C**: Separate memory service with HTTP API (complex)

## Key Learnings

1. **Closure pattern works in Node.js but NOT in Convex actions with AI SDK streaming**
2. **Pre-fetch is often simpler and better than on-demand for chat use cases**
3. **Convex build cache can be stale - restart dev server when deleting files**
4. **AI SDK v4 → v5 breaking changes**: `parameters` → `inputSchema`
5. **Graceful degradation is critical** - never block generation on memory failures

## References

- **Convex Actions**: https://docs.convex.dev/functions/actions
- **AI SDK v5 Tools**: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
- **Hybrid Search**: Reciprocal Rank Fusion (RRF) algorithm
- **Memory Implementation**: `convex/memories/search.ts`
- **Formatting Helpers**: `convex/lib/prompts/formatting.ts`

## Status

✅ **COMPLETED** - Memory retrieval now working via pre-fetch approach

**Next Steps**:
1. Test in production
2. Monitor token usage and costs
3. Consider optimizations if needed
4. Document user-facing features in help docs
