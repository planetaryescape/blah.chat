# Phase 3: Document Management Tools

## Overview

This phase creates the LLM tools for document management. When the LLM detects a conversation about writing or coding, it uses these tools to create and manage documents in the Canvas. This is the bridge between the chat interface and the editor.

## Context

### How Canvas Fits in the Tool System

blah.chat has an existing tool system with 18 tools (memory, search, calculator, etc.). Each tool:

1. Has a **creator function** in `convex/ai/tools/`
2. Returns a Vercel AI SDK `tool()` object
3. Has a **renderer** in `src/components/chat/toolRenderers/`
4. Is registered in the generation action

Canvas adds 3 new tools:

| Tool | Purpose | When LLM Uses It |
|------|---------|------------------|
| `createDocument` | Create new document, open Canvas | User wants to write/code something substantial |
| `updateDocument` | Apply text changes to document | User requests changes to existing document |
| `readDocument` | Get current document content | LLM needs to see latest content before changes |

### Why These Tools?

**Without tools**: LLM would write full content in chat messages, wasting tokens and cluttering conversation.

**With tools**: LLM creates document once, then sends targeted diffs. Chat stays lean. Document state persists.

### Flow Example

```
User: "Write me a Python script to process CSV files"

LLM: [Uses createDocument tool]
     → Creates document with title "CSV Processor", type "code", language "python"
     → Canvas opens with initial code

LLM: "I've created a CSV processor script. It includes..."

User: "Add error handling for missing files"

LLM: [Uses updateDocument tool with diff]
     → Applies diff to add try/except block
     → Canvas shows updated code

LLM: "I've added error handling. The script now..."
```

## Prerequisites

- **Phase 1**: Schema with `canvasDocuments` table
- **Phase 2**: Monaco editor integrated in Canvas
- Existing tool system in `convex/ai/tools/`

## What Comes After

- **Phase 4**: Diff system (enhances `updateDocument` with precise diffs)
- **Phase 5**: Mode system (auto-activates Canvas)
- **Phase 6**: Polish

---

## Scope

### In Scope

1. `createDocument` tool - creates new document, opens Canvas
2. `updateDocument` tool - updates document content (full replacement for now)
3. `readDocument` tool - retrieves current document content
4. Tool renderers for UI feedback
5. Register tools in generation action

### Out of Scope

- Diff-based updates (Phase 4 - for now, `updateDocument` does full replacement)
- Auto-mode detection (Phase 5)
- Conflict resolution (Phase 6)

---

## Implementation

### 1. Create Document Tool

Create `convex/ai/tools/createDocument.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export function createDocumentTool(ctx: ActionCtx, conversationId: string) {
  return tool({
    description: `Create a new document in the Canvas editor. Use this when the user wants to write, code, or work on substantial content (articles, scripts, essays, code files). The Canvas opens a side-by-side editor where content can be iteratively refined.

Guidelines:
- Use for content that will be edited/refined (not one-off answers)
- Choose "code" type for programming, "prose" for writing
- Provide meaningful title and initial content
- After creating, explain what you've written

Examples of when to use:
- "Write me a Python script..."
- "Help me draft an article about..."
- "Create a React component that..."
- "Write a business proposal for..."`,

    parameters: z.object({
      title: z.string().describe("Document title (e.g., 'CSV Processor', 'Marketing Strategy Draft')"),
      content: z.string().describe("Initial document content"),
      documentType: z.enum(["code", "prose"]).describe("'code' for programming, 'prose' for writing/essays"),
      language: z.string().optional().describe("Programming language (e.g., 'typescript', 'python'). Only for code type."),
    }),

    execute: async ({ title, content, documentType, language }) => {
      try {
        // @ts-ignore - Type depth workaround
        const documentId = await (ctx.runMutation as any)(
          internal.canvas.documents.create,
          {
            conversationId,
            title,
            content,
            documentType,
            language: documentType === "code" ? language : undefined,
          }
        );

        return {
          success: true,
          documentId,
          title,
          documentType,
          language,
          contentLength: content.length,
          lineCount: content.split("\n").length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create document",
        };
      }
    },
  });
}
```

### 2. Update Document Tool

Create `convex/ai/tools/updateDocument.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export function updateDocumentTool(ctx: ActionCtx, conversationId: string) {
  return tool({
    description: `Update the content of the current Canvas document. Use this to make changes based on user feedback.

Guidelines:
- Use after createDocument has been called
- Provide the complete updated content (for now - diff support coming)
- Describe what changed in your response to the user

Note: In future versions, this will accept diffs instead of full content for efficiency.`,

    parameters: z.object({
      content: z.string().describe("The complete updated document content"),
      changeDescription: z.string().describe("Brief description of what changed (for history)"),
    }),

    execute: async ({ content, changeDescription }) => {
      try {
        // Get active document for this conversation
        // @ts-ignore - Type depth workaround
        const document = await (ctx.runQuery as any)(
          internal.canvas.documents.getByConversationInternal,
          { conversationId }
        );

        if (!document) {
          return {
            success: false,
            error: "No active document. Use createDocument first.",
          };
        }

        // @ts-ignore - Type depth workaround
        const result = await (ctx.runMutation as any)(
          internal.canvas.documents.updateContent,
          {
            documentId: document._id,
            content,
            source: "llm_diff",
            diff: changeDescription, // Store description as diff for now
          }
        );

        return {
          success: true,
          documentId: document._id,
          newVersion: result.version,
          contentLength: content.length,
          lineCount: content.split("\n").length,
          changeDescription,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update document",
        };
      }
    },
  });
}
```

### 3. Read Document Tool

Create `convex/ai/tools/readDocument.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export function readDocumentTool(ctx: ActionCtx, conversationId: string) {
  return tool({
    description: `Read the current content of the Canvas document. Use this before making updates to ensure you have the latest version (user may have made manual edits).

When to use:
- Before applying changes, if significant time has passed
- When user says "update the current code" and you need to see it
- When user has mentioned making their own edits`,

    parameters: z.object({
      includeMetadata: z.boolean().optional().describe("Include title, language, version info"),
    }),

    execute: async ({ includeMetadata = false }) => {
      try {
        // @ts-ignore - Type depth workaround
        const document = await (ctx.runQuery as any)(
          internal.canvas.documents.getByConversationInternal,
          { conversationId }
        );

        if (!document) {
          return {
            success: false,
            error: "No active document in Canvas.",
            hasDocument: false,
          };
        }

        const result: Record<string, unknown> = {
          success: true,
          hasDocument: true,
          content: document.content,
          lineCount: document.content.split("\n").length,
        };

        if (includeMetadata) {
          result.title = document.title;
          result.language = document.language;
          result.documentType = document.documentType;
          result.version = document.version;
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to read document",
          hasDocument: false,
        };
      }
    },
  });
}
```

### 4. Internal Query for Tools

Add internal query in `convex/canvas/documents.ts`:

```typescript
import { internalQuery } from "../_generated/server";

// Internal query for tools (no auth check - called from trusted actions)
export const getByConversationInternal = internalQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("canvasDocuments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId as Id<"conversations">)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});
```

### 5. Tool Renderers

**NOTE:** Following existing `ToolRendererProps` pattern from `src/components/chat/toolRenderers/types.ts`.

Create `src/components/chat/toolRenderers/CreateDocumentRenderer.tsx`:

```typescript
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the createDocument tool.
 * Shows document creation success/failure with metadata.
 */
export function CreateDocumentRenderer({
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
          "{parsedArgs?.title}"
        </span>
        {parsedArgs?.language && (
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
            {parsedArgs.language}
          </span>
        )}
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.success ? (
            <span>
              Created • {parsedResult.lineCount} lines
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

Create `src/components/chat/toolRenderers/UpdateDocumentRenderer.tsx`:

```typescript
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the updateDocument tool.
 * Shows update status and version info.
 */
export function UpdateDocumentRenderer({
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
          {parsedArgs?.changeDescription || "Updating document..."}
        </span>
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.success ? (
            <span>Updated to v{parsedResult.newVersion}</span>
          ) : (
            <span className="text-destructive">{parsedResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

Create `src/components/chat/toolRenderers/ReadDocumentRenderer.tsx`:

```typescript
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the readDocument tool.
 * Shows document read status.
 */
export function ReadDocumentRenderer({
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
          Reading document...
        </span>
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.hasDocument ? (
            <span>
              {parsedResult.title || "Document"} • {parsedResult.lineCount} lines
            </span>
          ) : (
            <span>No document open</span>
          )}
        </div>
      )}
    </div>
  );
}
```

### 6. Register Renderers in Registry

Update `src/components/chat/toolRenderers/index.ts`:

```typescript
// Add imports
import { CreateDocumentRenderer } from "./CreateDocumentRenderer";
import { UpdateDocumentRenderer } from "./UpdateDocumentRenderer";
import { ReadDocumentRenderer } from "./ReadDocumentRenderer";

// Add to toolRenderers object:
export const toolRenderers: Record<string, ComponentType<ToolRendererProps>> = {
  // ... existing renderers
  // Canvas tools
  createDocument: CreateDocumentRenderer,
  updateDocument: UpdateDocumentRenderer,
  readDocument: ReadDocumentRenderer,
};
```

### 7. Register Tools in Generation Action

Update `convex/generation.ts`:

```typescript
import { createDocumentTool } from "./ai/tools/createDocument";
import { updateDocumentTool } from "./ai/tools/updateDocument";
import { readDocumentTool } from "./ai/tools/readDocument";

// In the generation action, add to tools object:
const tools = {
  // ... existing tools
  createDocument: createDocumentTool(ctx, conversationId),
  updateDocument: updateDocumentTool(ctx, conversationId),
  readDocument: readDocumentTool(ctx, conversationId),
};
```

### 8. Add Icons and Labels

Update `src/components/chat/ToolCallDisplay.tsx`:

```typescript
// Add imports
import { FileText, RefreshCw, Eye } from "lucide-react";

// In getToolIcon function, add cases:
function getToolIcon(toolName: string) {
  switch (toolName) {
    // ... existing cases
    case "createDocument":
      return FileText;
    case "updateDocument":
      return RefreshCw;
    case "readDocument":
      return Eye;
    default:
      return Wrench;
  }
}

// In getToolLabel function, add cases:
function getToolLabel(
  toolName: string,
  isExecuting: boolean,
  result: any,
): string {
  switch (toolName) {
    // ... existing cases
    case "createDocument":
      if (isExecuting) return "Creating document...";
      if (result?.success === false) return "Failed to create";
      return `Created "${result?.title || "document"}"`;
    case "updateDocument":
      if (isExecuting) return "Updating document...";
      if (result?.success === false) return "Update failed";
      return `Updated to v${result?.newVersion}`;
    case "readDocument":
      if (isExecuting) return "Reading document...";
      if (!result?.hasDocument) return "No document";
      return `Read document (${result?.lineCount} lines)`;
    default:
      if (isExecuting) return `Running ${toolName}...`;
      return toolName;
  }
}
```

### 9. Open Canvas When Document Created

When `createDocument` succeeds, open the Canvas panel. Handle this in the chat page, NOT in the context:

```typescript
// In src/app/(main)/chat/[conversationId]/page.tsx

// Watch for canvas documents
const canvasDocument = useQuery(
  api.canvas.documents.getByConversation,
  { conversationId }
);

const { setIsOpen, setDocumentId } = useCanvas();

// Auto-open canvas when document is created
useEffect(() => {
  if (canvasDocument) {
    setDocumentId(canvasDocument._id);
    setIsOpen(true);
  }
}, [canvasDocument, setDocumentId, setIsOpen]);
```

**NOTE:** This logic stays in the page component, not in CanvasContext. The context remains a simple state wrapper.

---

## Tool Descriptions for System Prompt

Add these tool descriptions to the system prompt so the LLM knows when to use them:

```typescript
// In src/lib/prompts/documentTools.ts

export const DOCUMENT_TOOLS_PROMPT = `
## Canvas Document Tools

You have access to a Canvas - a side-by-side document editor for writing and coding tasks.

### When to use Canvas:
- Writing substantial content (articles, essays, documentation)
- Creating code (scripts, components, functions)
- Any content the user will want to edit, refine, or export
- Multi-step writing/coding tasks

### When NOT to use Canvas:
- Quick answers or explanations
- Short code snippets (< 20 lines)
- One-off content not meant for editing

### Tools:
1. **createDocument**: Create new document. Opens Canvas.
2. **updateDocument**: Modify existing document content.
3. **readDocument**: Get current document content (use before updates if user may have edited).

### Best Practices:
- Create document FIRST, then explain what you wrote
- Before updating, consider if user made manual edits
- Describe changes clearly in your responses
`;
```

---

## File Structure

After this phase:

```
convex/
├── ai/
│   └── tools/
│       ├── createDocument.ts    # NEW
│       ├── updateDocument.ts    # NEW
│       └── readDocument.ts      # NEW
├── canvas/
│   └── documents.ts             # Updated with internal query

src/
├── components/
│   └── chat/
│       ├── ToolCallDisplay.tsx              # Updated with icons/labels
│       └── toolRenderers/
│           ├── CreateDocumentRenderer.tsx   # NEW
│           ├── UpdateDocumentRenderer.tsx   # NEW
│           ├── ReadDocumentRenderer.tsx     # NEW
│           └── index.ts                     # Updated with new renderers
├── lib/
│   └── prompts/
│       └── documentTools.ts     # NEW
├── app/
│   └── (main)/
│       └── chat/
│           └── [conversationId]/
│               └── page.tsx     # Updated with auto-open logic
```

---

## Testing Checklist

- [ ] `createDocument` tool creates document in database
- [ ] Canvas opens automatically when document created
- [ ] Tool call appears in chat with correct renderer
- [ ] `updateDocument` modifies existing document
- [ ] `updateDocument` fails gracefully if no document exists
- [ ] `readDocument` returns current content
- [ ] `readDocument` indicates no document if Canvas empty
- [ ] Version number increments on updates
- [ ] History entries created for LLM updates
- [ ] Chat remains lean (no full document in messages)

---

## LLM Prompt Testing

Test these prompts to verify tool usage:

1. "Write me a Python script to download YouTube videos"
   - Should use `createDocument` with type "code", language "python"

2. "Now add progress bar support"
   - Should use `updateDocument` (or `readDocument` first if uncertain)

3. "Help me write a blog post about AI trends"
   - Should use `createDocument` with type "prose"

4. "Make the introduction more engaging"
   - Should use `updateDocument`

5. "What does the current document say?"
   - Should use `readDocument`

---

## Notes

- **Full replacement for now**: `updateDocument` replaces entire content. Phase 4 adds diff support.
- **No auto-mode yet**: LLM must explicitly choose to use document tools. Phase 5 adds mode detection.
- **Conversation-scoped**: One active document per conversation. Creating new archives old.

---

## References

- Existing tool pattern: `convex/ai/tools/webSearch.ts`
- Tool renderer pattern: `src/components/chat/toolRenderers/WebSearchRenderer.tsx`
- Vercel AI SDK tools: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
