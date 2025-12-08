# How to Create a Tool for blah.chat

This guide covers everything needed to create a new tool that LLMs can use during chat.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      generation.ts                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  streamText({                                        │   │
│  │    tools: {                                          │   │
│  │      searchMemories: createMemorySearchTool(ctx),    │   │
│  │      saveMemory: createMemorySaveTool(ctx),          │   │
│  │      yourNewTool: createYourNewTool(ctx),  ← ADD     │   │
│  │    }                                                 │   │
│  │  })                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              convex/ai/tools/your-tool.ts                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  export function createYourNewTool(ctx, userId) {    │   │
│  │    return tool({                                     │   │
│  │      description: "...",                             │   │
│  │      inputSchema: z.object({...}),                   │   │
│  │      execute: async (input) => { ... }               │   │
│  │    });                                               │   │
│  │  }                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Guide

### Step 1: Create Tool Factory Function

Create a new file in `convex/ai/tools/` or add to an existing one.

```typescript
// convex/ai/tools/your-tool.ts
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

/**
 * CRITICAL: Tool must be created inside action handler via factory function.
 * Closures over ActionCtx fail during streaming if defined at module level.
 */
export function createYourTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Clear description of what this tool does and when to use it.

✅ CALL WHEN:
- Specific trigger conditions
- User asks for X

❌ DO NOT CALL WHEN:
- Anti-patterns
- When other tools are better suited`,

    inputSchema: z.object({
      // Define typed inputs with descriptions
      query: z.string().describe("What to search for"),
      limit: z.number().optional().default(5).describe("Max results"),
    }),

    // @ts-ignore - Convex + AI SDK type depth issues
    execute: async (input) => {
      try {
        // Tool logic here
        const result = await doSomething(input);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("[Tool] Your tool failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
}
```

### Step 2: Register Tool in generation.ts

Update `convex/generation.ts` to include your tool:

```typescript
// Import your tool factory
import { createYourTool } from "./ai/tools/your-tool";

// In generateResponse action, add to tools object:
if (hasFunctionCalling) {
  const memorySearchTool = createMemorySearchTool(ctx, args.userId);
  const memorySaveTool = createMemorySaveTool(ctx, args.userId);
  const yourTool = createYourTool(ctx, args.userId);  // Add this

  options.tools = {
    searchMemories: memorySearchTool,
    saveMemory: memorySaveTool,
    yourNewTool: yourTool,  // Add this
  };
}
```

### Step 3: Update ToolCallDisplay (Optional)

If your tool needs custom UI, update `src/components/chat/ToolCallDisplay.tsx`:

```typescript
function getToolIcon(toolName: string) {
  switch (toolName) {
    case "yourNewTool":
      return YourIcon;  // Import from lucide-react
    // ...existing cases
  }
}

function getToolLabel(toolName: string, isExecuting: boolean, result: any): string {
  switch (toolName) {
    case "yourNewTool":
      if (isExecuting) return "Processing...";
      return `Done (${result?.count || 0} items)`;
    // ...existing cases
  }
}
```

---

## Tool Types

### Type 1: Local Execution (No Backend)

For simple tools that don't need Convex actions (calculator, datetime):

```typescript
export function createCalculatorTool() {
  return tool({
    description: "Perform mathematical calculations",
    inputSchema: z.object({
      expression: z.string().describe("Math expression to evaluate"),
    }),
    execute: async ({ expression }) => {
      // Direct execution, no ctx.runAction needed
      const result = evaluate(expression);
      return { result };
    },
  });
}
```

### Type 2: Backend Action Required

For tools that need database access or external APIs:

```typescript
// convex/ai/tools/your-tool.ts
export function createYourTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    // ...
    execute: async (input) => {
      // Call backend action
      return await ctx.runAction(
        internal.yourModule.yourAction,
        { userId, ...input }
      );
    },
  });
}

// convex/your-module.ts
export const yourAction = internalAction({
  args: { userId: v.id("users"), query: v.string() },
  handler: async (ctx, args) => {
    // Access database, call external APIs, etc.
    return { success: true, data: ... };
  },
});
```

---

## Critical Patterns

### 1. Context Serialization

**Problem**: AI SDK serializes tools across streaming. Closures fail.

**Solution**: Create tools at runtime inside action handler.

```typescript
// ❌ WRONG - Will hang
const myTool = tool({
  execute: async () => {
    await ctx.runAction(...); // ctx is not serializable
  },
});

// ✅ CORRECT - Create inside handler
function createMyTool(ctx: ActionCtx) {
  return tool({
    execute: async () => {
      await ctx.runAction(...); // ctx captured via closure at runtime
    },
  });
}
```

### 2. Multi-Step Tool Calling

Use `stopWhen` not `maxSteps`:

```typescript
import { stepCountIs } from "ai";

streamText({
  tools: { ... },
  stopWhen: stepCountIs(5), // Continue until 5 steps or no more tool calls
});
```

### 3. Graceful Error Handling

Always return structured responses, never throw:

```typescript
execute: async (input) => {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    // Log for debugging
    console.error("[Tool] Failed:", error);
    // Return error, don't throw
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## Tool Description Best Practices

1. **Be specific** about when to call (and when NOT to)
2. **Use examples** in the description
3. **Describe all parameters** with `.describe()`
4. **Keep it concise** - LLMs have limited context

```typescript
description: `Search the web for current information.

✅ USE FOR:
- Current events, news, prices
- Recent documentation or release notes
- Fact-checking claims

❌ DO NOT USE FOR:
- Information you already know from training
- User preferences (use memory tool instead)
- Code generation (use code execution tool)

Returns top 5 results with titles, snippets, and URLs.`
```

---

## Checklist for New Tools

- [ ] Create tool factory in `convex/ai/tools/`
- [ ] Create backend action if needed in `convex/`
- [ ] Add import to `convex/generation.ts`
- [ ] Register in `options.tools` object
- [ ] Update `ToolCallDisplay.tsx` for custom UI (optional)
- [ ] Add environment variables if using external API
- [ ] Document in `docs/tools/your-tool.md`
- [ ] Test with explicit trigger ("use the X tool to...")
- [ ] Test natural trigger (implicit usage)

---

## Environment Variables

For tools using external APIs, add to `.env.local`:

```bash
# Web Search
TAVILY_API_KEY=tvly-...

# Code Execution
E2B_API_KEY=e2b_...

# URL Reading
JINA_API_KEY=jina_...
```

And update `convex/` to access via `process.env`.

---

## Key Files

| File | Purpose |
|------|---------|
| `convex/ai/tools/*.ts` | Tool definitions |
| `convex/generation.ts` | Tool registration |
| `src/components/chat/ToolCallDisplay.tsx` | Tool UI |
| `docs/features/tool-calling.md` | Technical documentation |
