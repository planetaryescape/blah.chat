# Tools System

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

**Key insight**: Tools MUST be created via factory functions inside the action handler. Defining tools at module level causes closures over `ActionCtx` to fail during streaming serialization.

---

## Critical Pattern: Factory Functions

```typescript
// WRONG - will hang/fail
const myTool = tool({
  execute: async () => {
    await ctx.runAction(...); // ctx not serializable
  },
});

// CORRECT - create at runtime
function createMyTool(ctx: ActionCtx) {
  return tool({
    execute: async () => {
      await ctx.runAction(...); // captured via closure at runtime
    },
  });
}
```

---

## Tool Categories

### 1. Local Execution (No Backend)
- **Calculator** - mathjs for precision arithmetic
- **DateTime** - date-fns for time/calendar operations

No `ctx.runAction` needed. Execute directly in the tool.

### 2. Backend Action Required
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

## Multi-Step Tool Calling

Vercel AI SDK v5 uses `stopWhen`, not `maxSteps`:

```typescript
import { stepCountIs } from "ai";

streamText({
  tools: { ... },
  stopWhen: stepCountIs(5), // Continue until 5 steps or no more tool calls
});
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

## TypeScript Note

Use `@ts-ignore` on execute function due to Convex + AI SDK type depth issues:

```typescript
// @ts-ignore - Convex + AI SDK type depth issues
execute: async (input) => { ... }
```

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

## Future Enhancement Ideas

1. **File/Document Tool** - Read uploaded attachments on-demand (depends on file upload infra)
2. **Project Context Tool** - Surface project notes/files/history during chat
3. **Image Generation** - DALL-E or similar
4. **Database Query** - Let LLM query structured data
5. **Calendar Integration** - Schedule/check events
6. **Email/Notification** - Send alerts

---

## Key Decisions Made

1. **Factory pattern mandatory** - Serialization issues with closures
2. **Tavily over Serper** - Returns content, not just links; better for LLMs
3. **Jina over DIY** - Free tier, handles JS pages, returns markdown
4. **E2B over Pyodide** - Better security, multi-language, but Pyodide viable for MVP
5. **Structured errors over throws** - LLM can explain failures gracefully
6. **Explicit description patterns** - Tell LLM when/when not to use

---

## Files

| Location | Purpose |
|----------|---------|
| `convex/ai/tools/*.ts` | Tool factory functions |
| `convex/tools/*.ts` | Backend actions for tools |
| `convex/generation.ts` | Tool registration |
| `src/components/chat/ToolCallDisplay.tsx` | UI rendering |
