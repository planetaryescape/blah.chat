# Phase 5: Mode System

## Overview

This phase implements the mode system - a way to dynamically inject additional context and tools when the conversation enters "document editing mode." Instead of always loading document tools in the system prompt, we activate them only when relevant, keeping the base context lean.

## Context

### The Problem with Always-On Tools

If we include all Canvas tools in every conversation:
- **Wasted context**: Document tools consume ~500 tokens even when unused
- **Confusion**: LLM might use `createDocument` for simple code snippets
- **Noise**: Tool descriptions clutter the system prompt

### The Mode System Solution

```
Normal Mode:
- Base system prompt
- Core tools (memory, search, calculator, etc.)
- No document tools

Document Editing Mode (activated by LLM):
- Base system prompt + document context
- Core tools + document tools (createDocument, updateDocument, readDocument)
- Canvas UI opened
- Diff tracking enabled
```

### How Mode Activation Works

1. **Base prompt** tells LLM: "If you detect the user wants to write/code something substantial, use the `enterDocumentMode` tool"
2. **LLM calls `enterDocumentMode`** with detected intent
3. **Mode switch**:
   - Conversation state updated: `mode: "document"`
   - Additional system prompt injected
   - Document tools become available
   - Canvas UI opens

### Why This Pattern?

This is a proven pattern used by:
- **ChatGPT Canvas**: Detects writing/coding intent, switches UI
- **Claude Artifacts**: Detects substantial content, opens side panel
- **Cursor AI**: Context-aware tool injection based on task type

The key insight: **LLM detects intent, system handles mode switch**. This keeps the architecture clean and the LLM in control.

## Prerequisites

- **Phase 1**: Schema, CanvasContext, CanvasLayout
- **Phase 2**: Monaco editor integration
- **Phase 3**: Document tools (createDocument, updateDocument, readDocument)
- **Phase 4**: Diff system

## What Comes After

- **Phase 6**: Polish, conflict resolution, undo/redo UI

---

## Scope

### In Scope

1. `enterDocumentMode` tool for mode activation
2. `exitDocumentMode` tool for returning to normal
3. Conversation mode state in database
4. Mode-aware system prompt builder
5. Mode-aware tool injection
6. Canvas auto-open/close based on mode
7. Mode indicator in UI

### Out of Scope

- Auto-detection without LLM (future ML classifier)
- Multiple simultaneous modes (e.g., "research + document")
- Mode history/analytics

---

## Implementation

### 1. Schema Update for Mode

Add mode field to conversations:

```typescript
// In convex/schema.ts

conversations: defineTable({
  // ... existing fields

  // Mode system
  mode: v.optional(v.union(
    v.literal("normal"),
    v.literal("document")
  )),
  modeActivatedAt: v.optional(v.number()),
  modeContext: v.optional(v.string()), // JSON with mode-specific data
})
```

### 2. Mode Tools

Create `convex/ai/tools/documentMode.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Tool to enter document editing mode
 * Called by LLM when it detects user wants to write/code something substantial
 */
export function enterDocumentModeTool(ctx: ActionCtx, conversationId: string) {
  return tool({
    description: `Activate document editing mode when the user wants to write or code something substantial.

**When to use:**
- User asks to write an article, essay, blog post, documentation
- User asks to create a script, component, function, or code file
- User says "help me write...", "create a...", "draft a..."
- Content will be > 20 lines or need iteration/refinement

**When NOT to use:**
- Quick answers or explanations
- Short code snippets (< 20 lines) that don't need editing
- Questions about existing code
- General conversation

**After activation:**
- Canvas editor will open on the right
- You'll have access to createDocument, updateDocument, readDocument tools
- Use createDocument to start writing
- Chat will show the mode is active`,

    parameters: z.object({
      intent: z.string().describe("What the user wants to create (e.g., 'Python script for data processing', 'Blog post about AI')"),
      documentType: z.enum(["code", "prose"]).describe("Type of content: 'code' for programming, 'prose' for writing"),
      suggestedLanguage: z.string().optional().describe("For code: suggested programming language"),
    }),

    execute: async ({ intent, documentType, suggestedLanguage }) => {
      try {
        // @ts-ignore - Type depth workaround
        await (ctx.runMutation as any)(
          internal.conversations.setMode,
          {
            conversationId,
            mode: "document",
            modeContext: JSON.stringify({
              intent,
              documentType,
              suggestedLanguage,
              activatedAt: Date.now(),
            }),
          }
        );

        return {
          success: true,
          mode: "document",
          message: "Document editing mode activated. Canvas editor is now open. Use createDocument to start writing.",
          intent,
          documentType,
          suggestedLanguage,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to enter document mode",
        };
      }
    },
  });
}

/**
 * Tool to exit document editing mode
 * Called when document work is complete
 */
export function exitDocumentModeTool(ctx: ActionCtx, conversationId: string) {
  return tool({
    description: `Exit document editing mode and return to normal conversation.

**When to use:**
- User says they're done with the document
- User wants to discuss something unrelated
- Document work is complete and user confirms

**Note:** The document remains saved and accessible. User can re-enter document mode later.`,

    parameters: z.object({
      reason: z.string().optional().describe("Why exiting (e.g., 'document complete', 'user requested')"),
    }),

    execute: async ({ reason }) => {
      try {
        // @ts-ignore - Type depth workaround
        await (ctx.runMutation as any)(
          internal.conversations.setMode,
          {
            conversationId,
            mode: "normal",
            modeContext: undefined,
          }
        );

        return {
          success: true,
          mode: "normal",
          message: "Returned to normal conversation mode. The document has been saved.",
          reason,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to exit document mode",
        };
      }
    },
  });
}
```

### 3. Conversation Mode Mutation

Add to `convex/conversations.ts`:

```typescript
import { internalMutation } from "./_generated/server";

export const setMode = internalMutation({
  args: {
    conversationId: v.string(),
    mode: v.union(v.literal("normal"), v.literal("document")),
    modeContext: v.optional(v.string()),
  },
  handler: async (ctx, { conversationId, mode, modeContext }) => {
    const id = conversationId as Id<"conversations">;
    const conversation = await ctx.db.get(id);
    if (!conversation) throw new Error("Conversation not found");

    await ctx.db.patch(id, {
      mode,
      modeContext,
      modeActivatedAt: mode === "normal" ? undefined : Date.now(),
    });
  },
});

// Query for current mode
export const getMode = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    return {
      mode: conversation?.mode ?? "normal",
      modeContext: conversation?.modeContext
        ? JSON.parse(conversation.modeContext)
        : null,
    };
  },
});
```

### 4. Mode-Aware System Prompt Builder

Create `src/lib/prompts/modePrompts.ts`:

```typescript
export const BASE_MODE_INSTRUCTION = `
## Content Creation Modes

When users want to write or code something substantial (articles, scripts, essays, components), you can activate **Document Editing Mode** using the \`enterDocumentMode\` tool.

This opens a split-screen Canvas editor where:
- Content persists (survives page refresh)
- You send diffs instead of full rewrites
- Users can make manual edits
- Changes are versioned

**Activate document mode when:**
- User wants to write something > 20 lines
- Content will need iteration/refinement
- User says "write me a...", "create a...", "draft a..."

**Stay in normal mode for:**
- Quick answers
- Short code snippets
- Explanations
- General discussion
`;

export const DOCUMENT_MODE_SYSTEM_PROMPT = `
## Document Editing Mode Active

You are now in document editing mode. A Canvas editor is open on the right side of the chat.

### Available Tools:
- **createDocument**: Create a new document in Canvas
- **updateDocument**: Apply diff operations to the document
- **readDocument**: Get current document content

### Best Practices:
1. **Start with createDocument** to initialize the document
2. **Use diffs for updates** - don't rewrite entire content
3. **Check for user edits** - if user may have edited, use readDocument first
4. **Explain changes** - describe what you changed and why

### Diff Operations:
- \`replace\`: Change lines startLine to endLine
- \`insert\`: Add content after a line
- \`delete\`: Remove lines

### When Done:
When the user indicates they're finished, use \`exitDocumentMode\` to return to normal conversation.

### User Edits:
If you see "[User made manual edits]" in the context, the user modified the document directly. Acknowledge their changes and work from the updated version.
`;

export function buildModeAwarePrompt(
  basePrompt: string,
  mode: "normal" | "document",
  modeContext?: { intent?: string; documentType?: string } | null
): string {
  let prompt = basePrompt;

  // Always include mode instruction in base prompt
  prompt += "\n\n" + BASE_MODE_INSTRUCTION;

  // Add mode-specific context
  if (mode === "document") {
    prompt += "\n\n" + DOCUMENT_MODE_SYSTEM_PROMPT;

    if (modeContext) {
      prompt += `\n\n### Current Task\nIntent: ${modeContext.intent}\nDocument Type: ${modeContext.documentType}`;
    }
  }

  return prompt;
}
```

### 5. Mode-Aware Tool Registry

Update `convex/generation.ts` to inject tools based on mode:

```typescript
import { enterDocumentModeTool, exitDocumentModeTool } from "./ai/tools/documentMode";
import { createDocumentTool } from "./ai/tools/createDocument";
import { updateDocumentTool } from "./ai/tools/updateDocument";
import { readDocumentTool } from "./ai/tools/readDocument";

// In generation action:
async function buildTools(
  ctx: ActionCtx,
  conversationId: string,
  mode: "normal" | "document"
) {
  // Base tools always available
  const tools: Record<string, ReturnType<typeof tool>> = {
    saveMemory: createMemorySaveTool(ctx),
    searchMemories: createMemorySearchTool(ctx),
    webSearch: createWebSearchTool(ctx),
    calculator: createCalculatorTool(),
    datetime: createDatetimeTool(),
    // ... other base tools

    // Mode switching tools (always available)
    enterDocumentMode: enterDocumentModeTool(ctx, conversationId),
  };

  // Document mode tools (only when in document mode)
  if (mode === "document") {
    tools.createDocument = createDocumentTool(ctx, conversationId);
    tools.updateDocument = updateDocumentTool(ctx, conversationId);
    tools.readDocument = readDocumentTool(ctx, conversationId);
    tools.exitDocumentMode = exitDocumentModeTool(ctx, conversationId);
  }

  return tools;
}

// In the generation handler:
const { mode, modeContext } = await ctx.runQuery(
  api.conversations.getMode,
  { conversationId }
);

const tools = await buildTools(ctx, conversationId, mode);
const systemPrompt = buildModeAwarePrompt(basePrompt, mode, modeContext);
```

### 6. Canvas Mode State Hook

Create `src/hooks/useCanvasMode.ts`:

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect } from "react";
import { useCanvas } from "@/contexts/CanvasContext";

/**
 * Hook to manage Canvas mode state
 *
 * NOTE: Uses simple context pattern - just setIsOpen, not complex methods
 */
export function useCanvasMode(conversationId: Id<"conversations"> | undefined) {
  const { isOpen, setIsOpen, setDocumentId } = useCanvas();

  // Get current mode from Convex
  const modeData = useQuery(
    api.conversations.getMode,
    conversationId ? { conversationId } : "skip"
  );

  const mode = modeData?.mode ?? "normal";
  const modeContext = modeData?.modeContext;

  // Auto-open/close Canvas based on mode
  useEffect(() => {
    if (mode === "document" && !isOpen) {
      setIsOpen(true);
    } else if (mode === "normal" && isOpen) {
      setIsOpen(false);
      setDocumentId(null);
    }
  }, [mode, isOpen, setIsOpen, setDocumentId]);

  return {
    mode,
    modeContext,
    isDocumentMode: mode === "document",
    isLoading: modeData === undefined,
  };
}
```

### 7. Mode Indicator UI

Create `src/components/canvas/ModeIndicator.tsx`:

```typescript
"use client";

import { useCanvasMode } from "@/hooks/useCanvasMode";
import type { Id } from "@/convex/_generated/dataModel";
import { FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeIndicatorProps {
  conversationId: Id<"conversations">;
  className?: string;
}

export function ModeIndicator({ conversationId, className }: ModeIndicatorProps) {
  const { mode, modeContext, isLoading } = useCanvasMode(conversationId);

  if (isLoading) return null;

  const isDocumentMode = mode === "document";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors",
        isDocumentMode
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {isDocumentMode ? (
        <>
          <FileText className="w-3 h-3" />
          <span>Document Mode</span>
          {modeContext?.documentType && (
            <span className="opacity-70">
              • {modeContext.documentType === "code" ? "Code" : "Writing"}
            </span>
          )}
        </>
      ) : (
        <>
          <MessageSquare className="w-3 h-3" />
          <span>Chat</span>
        </>
      )}
    </div>
  );
}
```

### 8. Tool Renderers for Mode Tools

**NOTE:** Following existing `ToolRendererProps` pattern.

Create `src/components/chat/toolRenderers/EnterDocumentModeRenderer.tsx`:

```typescript
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the enterDocumentMode tool.
 */
export function EnterDocumentModeRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          {parsedArgs?.intent || "Entering document mode..."}
        </span>
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.success ? (
            <span>
              Document mode active • {parsedResult.documentType}
              {parsedResult.suggestedLanguage && ` • ${parsedResult.suggestedLanguage}`}
            </span>
          ) : (
            <span className="text-destructive">{parsedResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

Create `src/components/chat/toolRenderers/ExitDocumentModeRenderer.tsx`:

```typescript
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the exitDocumentMode tool.
 */
export function ExitDocumentModeRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          Returning to chat mode...
        </span>
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.success ? (
            <span>Back to chat mode</span>
          ) : (
            <span className="text-destructive">{parsedResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

**Register in `toolRenderers/index.ts`:**

```typescript
import { EnterDocumentModeRenderer } from "./EnterDocumentModeRenderer";
import { ExitDocumentModeRenderer } from "./ExitDocumentModeRenderer";

export const toolRenderers: Record<string, ComponentType<ToolRendererProps>> = {
  // ... existing
  enterDocumentMode: EnterDocumentModeRenderer,
  exitDocumentMode: ExitDocumentModeRenderer,
};
```

**Add icons and labels in `ToolCallDisplay.tsx`:**

```typescript
// In getToolIcon:
case "enterDocumentMode":
  return FileEdit;
case "exitDocumentMode":
  return MessageSquare;

// In getToolLabel:
case "enterDocumentMode":
  if (isExecuting) return "Entering document mode...";
  if (result?.success === false) return "Mode switch failed";
  return `Document mode (${result?.documentType})`;
case "exitDocumentMode":
  if (isExecuting) return "Exiting document mode...";
  if (result?.success === false) return "Mode switch failed";
  return "Returned to chat";
```

### 9. Integration with Chat Page

Update the chat page to use mode-aware components:

```typescript
// In src/app/(main)/chat/[conversationId]/page.tsx

import { useCanvasMode } from "@/hooks/useCanvasMode";
import { ModeIndicator } from "@/components/canvas/ModeIndicator";
import { CanvasPanel } from "@/components/canvas/CanvasPanel";

function ChatPage({ params }: { params: { conversationId: string } }) {
  const conversationId = params.conversationId as Id<"conversations">;

  // Hook handles auto-open/close based on mode
  useCanvasMode(conversationId);

  return (
    <CanvasProvider>
      <div className="flex h-full">
        {/* Chat area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <ChatHeader conversationId={conversationId}>
            {/* Add mode indicator to header */}
            <ModeIndicator conversationId={conversationId} />
          </ChatHeader>

          <VirtualizedMessageList conversationId={conversationId} />
          <ChatInput conversationId={conversationId} />
        </div>

        {/* Canvas panel - conditionally rendered inside */}
        <CanvasPanel />
      </div>
    </CanvasProvider>
  );
}
```

**Note:** `CanvasProvider` doesn't take props - it's a simple state wrapper. Mode handling is done via `useCanvasMode` hook.

---

## Flow Diagram

```
User: "Write me a Python script to scrape websites"
                    │
                    ▼
┌─────────────────────────────────────┐
│ LLM detects document intent         │
│ (substantial code, needs iteration) │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ LLM calls enterDocumentMode({       │
│   intent: "Python web scraper",     │
│   documentType: "code",             │
│   suggestedLanguage: "python"       │
│ })                                  │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ Convex updates conversation:        │
│   mode: "document"                  │
│   modeContext: { intent, type }     │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ React detects mode change:          │
│ - Canvas UI opens (split screen)    │
│ - Mode indicator updates            │
│ - Document tools now available      │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ LLM calls createDocument({          │
│   title: "Web Scraper",             │
│   content: "import requests..."     │
│ })                                  │
└─────────────────────────────────────┘
                    │
                    ▼
        Document editing continues...
                    │
                    ▼
User: "That's perfect, thanks!"
                    │
                    ▼
┌─────────────────────────────────────┐
│ LLM calls exitDocumentMode({        │
│   reason: "document complete"       │
│ })                                  │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ Canvas closes, back to normal chat  │
└─────────────────────────────────────┘
```

---

## File Structure

After this phase:

```
convex/
├── conversations.ts           # Updated with setMode, getMode
├── ai/
│   └── tools/
│       └── documentMode.ts    # NEW - enterDocumentMode, exitDocumentMode
├── generation.ts              # Updated with mode-aware tool building

src/
├── lib/
│   └── prompts/
│       └── modePrompts.ts     # NEW - Mode-specific prompts
├── hooks/
│   └── useCanvasMode.ts       # NEW - Mode state hook
├── components/
│   ├── canvas/
│   │   └── ModeIndicator.tsx  # NEW - UI indicator
│   └── chat/
│       ├── ToolCallDisplay.tsx                    # Updated with icons/labels
│       └── toolRenderers/
│           ├── EnterDocumentModeRenderer.tsx      # NEW
│           ├── ExitDocumentModeRenderer.tsx       # NEW
│           └── index.ts                           # Updated
```

---

## Testing Checklist

### Mode Activation
- [ ] "Write me a Python script" → LLM uses `enterDocumentMode`
- [ ] "Help me write a blog post" → LLM uses `enterDocumentMode`
- [ ] "What is Python?" → LLM stays in normal mode
- [ ] "Show me a one-liner to print hello" → LLM stays in normal mode

### Mode State
- [ ] Mode persists across page refresh
- [ ] Mode stored in database (`conversations.mode`)
- [ ] `modeContext` contains intent and type

### UI Behavior
- [ ] Canvas opens when mode becomes "document"
- [ ] Canvas closes when mode becomes "normal"
- [ ] Mode indicator shows current mode
- [ ] Mode indicator shows document type when in document mode

### Tool Injection
- [ ] `createDocument` only available in document mode
- [ ] `enterDocumentMode` available in normal mode
- [ ] `exitDocumentMode` only available in document mode

### Exit Flow
- [ ] "I'm done with the document" → LLM uses `exitDocumentMode`
- [ ] Canvas closes on exit
- [ ] Document remains saved

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Page refresh in document mode | Mode persists, Canvas re-opens |
| LLM errors in mode switch | Error shown, mode unchanged |
| User manually closes Canvas | Mode stays "document", can re-open |
| Multiple conversations | Each conversation has own mode |

---

## Notes

- **LLM decides mode**: System doesn't auto-detect. LLM chooses based on user intent.
- **Graceful fallback**: If LLM forgets to enter mode but uses `createDocument`, it still works (document tools always function, just not surfaced in normal mode).
- **Exit is optional**: Users can stay in document mode indefinitely. Documents save automatically.

---

## References

- ChatGPT Canvas mode: https://openai.com/index/introducing-canvas/
- Claude Artifacts detection: Internal inference based on content type
- Vercel AI SDK tool injection: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
