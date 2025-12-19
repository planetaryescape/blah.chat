# Phase 4: Diff System

## Overview

This phase implements the diff system - the core innovation that makes Canvas efficient. Instead of the LLM sending full document content on every change, it sends targeted diffs that are applied to the document. This also enables tracking user edits as diffs to inform the LLM what changed.

## Context

### Why Diffs Matter

Without diffs:
```
User: "Change the function name from 'process' to 'transform'"
LLM: [Sends entire 500-line file with one word changed]
     → Wastes tokens
     → Hard to see what changed
     → Loses user's formatting tweaks
```

With diffs:
```
User: "Change the function name from 'process' to 'transform'"
LLM: [Sends diff: line 45, replace "process" with "transform"]
     → Minimal tokens
     → Clear what changed
     → Preserves user edits
```

### Two Diff Operations

| Operation | Purpose | When Used |
|-----------|---------|-----------|
| **Diff Applier** | Apply LLM-generated diffs to document | LLM responds with changes |
| **Diff Grabber** | Extract diffs from user edits | User manually edits in Canvas |

### Technical Approach

We'll use Google's **diff-match-patch** library (via `diff` npm package):

- **diff**: Compute differences between two texts
- **match**: Find text locations (fuzzy matching)
- **patch**: Apply diffs to text

This is the same algorithm used by:
- Google Docs (real-time collaboration)
- Git (text diffs)
- Wikipedia (edit history)

### How LLM Sends Diffs

The LLM will use a structured diff format:

```json
{
  "operations": [
    {
      "type": "replace",
      "startLine": 10,
      "endLine": 12,
      "newContent": "// Updated comment\nconst value = 42;"
    },
    {
      "type": "insert",
      "afterLine": 25,
      "content": "function helper() {\n  return true;\n}"
    },
    {
      "type": "delete",
      "startLine": 30,
      "endLine": 32
    }
  ]
}
```

This is more reliable than unified diff format because:
1. Line numbers are explicit (no context matching needed)
2. Operations are atomic (can apply individually)
3. Works well with Monaco's `executeEdits()` API

## Prerequisites

- **Phase 1**: Document schema with version history
- **Phase 2**: Monaco editor with programmatic access
- **Phase 3**: Document tools (`createDocument`, `updateDocument`)

## What Comes After

- **Phase 5**: Mode system (auto-detect document editing)
- **Phase 6**: Conflict resolution, undo/redo UI

---

## Scope

### In Scope

1. Install `diff` library
2. Create diff utility functions
3. Implement `applyDiff` tool for LLM
4. Implement `grabDiff` utility for user edits
5. Update Monaco to track changes
6. Update `updateDocument` tool to accept diffs
7. Visual diff indicators in editor

### Out of Scope

- Conflict resolution (Phase 6)
- Undo/redo UI (Phase 6)
- Real-time collaboration (future)

---

## Implementation

### 1. Install Dependencies

```bash
bun add diff
bun add -D @types/diff
```

The `diff` package (8.0.2) is the modern, actively maintained version of diff algorithms.

### 2. Diff Utility Functions

Create `src/lib/canvas/diff.ts`:

```typescript
import { diffLines, createPatch, applyPatch } from "diff";

/**
 * Structured diff operation for LLM consumption
 */
export interface DiffOperation {
  type: "replace" | "insert" | "delete";
  startLine?: number;    // 1-indexed
  endLine?: number;      // 1-indexed, inclusive
  afterLine?: number;    // For insert: line after which to insert
  content?: string;      // New content (for replace/insert)
  newContent?: string;   // Alias for content (backwards compat)
}

export interface DiffResult {
  operations: DiffOperation[];
  summary: string;
  linesAdded: number;
  linesRemoved: number;
}

/**
 * Compute diff operations between two texts
 * Used by Diff Grabber to extract user edits
 */
export function computeDiff(oldText: string, newText: string): DiffResult {
  const changes = diffLines(oldText, newText);

  const operations: DiffOperation[] = [];
  let lineNumber = 1;
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const change of changes) {
    const lineCount = change.count ?? 0;

    if (change.added) {
      // Content was added
      linesAdded += lineCount;
      operations.push({
        type: "insert",
        afterLine: lineNumber - 1, // Insert after previous line
        content: change.value,
      });
    } else if (change.removed) {
      // Content was removed
      linesRemoved += lineCount;
      operations.push({
        type: "delete",
        startLine: lineNumber,
        endLine: lineNumber + lineCount - 1,
      });
      lineNumber += lineCount;
    } else {
      // Unchanged
      lineNumber += lineCount;
    }
  }

  // Merge adjacent delete+insert into replace operations
  const mergedOps = mergeOperations(operations);

  return {
    operations: mergedOps,
    summary: `${linesAdded} lines added, ${linesRemoved} lines removed`,
    linesAdded,
    linesRemoved,
  };
}

/**
 * Merge adjacent delete + insert into replace operations
 */
function mergeOperations(operations: DiffOperation[]): DiffOperation[] {
  const merged: DiffOperation[] = [];

  for (let i = 0; i < operations.length; i++) {
    const current = operations[i];
    const next = operations[i + 1];

    // Check if delete followed by insert at same position → replace
    if (
      current.type === "delete" &&
      next?.type === "insert" &&
      next.afterLine === (current.startLine ?? 0) - 1
    ) {
      merged.push({
        type: "replace",
        startLine: current.startLine,
        endLine: current.endLine,
        content: next.content,
      });
      i++; // Skip next operation
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Apply diff operations to text
 * Used by Diff Applier to apply LLM changes
 */
export function applyDiffOperations(
  text: string,
  operations: DiffOperation[]
): { result: string; applied: number; failed: string[] } {
  const lines = text.split("\n");
  const failed: string[] = [];
  let applied = 0;

  // Sort operations by line number descending (apply from bottom to top)
  // This prevents line number shifting issues
  const sortedOps = [...operations].sort((a, b) => {
    const lineA = a.startLine ?? a.afterLine ?? 0;
    const lineB = b.startLine ?? b.afterLine ?? 0;
    return lineB - lineA;
  });

  for (const op of sortedOps) {
    try {
      switch (op.type) {
        case "delete": {
          const start = (op.startLine ?? 1) - 1; // Convert to 0-indexed
          const end = (op.endLine ?? op.startLine ?? 1) - 1;
          const count = end - start + 1;

          if (start >= 0 && end < lines.length) {
            lines.splice(start, count);
            applied++;
          } else {
            failed.push(`Delete: lines ${op.startLine}-${op.endLine} out of bounds`);
          }
          break;
        }

        case "insert": {
          const afterLine = op.afterLine ?? 0;
          const content = op.content ?? op.newContent ?? "";
          const newLines = content.split("\n");

          // Remove trailing empty line if content ends with newline
          if (newLines[newLines.length - 1] === "") {
            newLines.pop();
          }

          if (afterLine >= 0 && afterLine <= lines.length) {
            lines.splice(afterLine, 0, ...newLines);
            applied++;
          } else {
            failed.push(`Insert: afterLine ${afterLine} out of bounds`);
          }
          break;
        }

        case "replace": {
          const start = (op.startLine ?? 1) - 1;
          const end = (op.endLine ?? op.startLine ?? 1) - 1;
          const count = end - start + 1;
          const content = op.content ?? op.newContent ?? "";
          const newLines = content.split("\n");

          if (newLines[newLines.length - 1] === "") {
            newLines.pop();
          }

          if (start >= 0 && end < lines.length) {
            lines.splice(start, count, ...newLines);
            applied++;
          } else {
            failed.push(`Replace: lines ${op.startLine}-${op.endLine} out of bounds`);
          }
          break;
        }
      }
    } catch (error) {
      failed.push(`${op.type}: ${error}`);
    }
  }

  return {
    result: lines.join("\n"),
    applied,
    failed,
  };
}

/**
 * Create a unified diff string for display/storage
 */
export function createUnifiedDiff(
  oldText: string,
  newText: string,
  fileName = "document"
): string {
  return createPatch(fileName, oldText, newText);
}

/**
 * Apply a unified diff patch
 */
export function applyUnifiedDiff(
  text: string,
  patch: string
): { result: string | false; success: boolean } {
  const result = applyPatch(text, patch);
  return {
    result,
    success: result !== false,
  };
}

/**
 * Validate diff operations before applying
 */
export function validateDiffOperations(
  text: string,
  operations: DiffOperation[]
): { valid: boolean; errors: string[] } {
  const lines = text.split("\n");
  const lineCount = lines.length;
  const errors: string[] = [];

  for (const op of operations) {
    switch (op.type) {
      case "delete":
      case "replace":
        if (!op.startLine || op.startLine < 1) {
          errors.push(`${op.type}: startLine must be >= 1`);
        }
        if (op.startLine && op.startLine > lineCount) {
          errors.push(`${op.type}: startLine ${op.startLine} exceeds document length ${lineCount}`);
        }
        if (op.endLine && op.endLine > lineCount) {
          errors.push(`${op.type}: endLine ${op.endLine} exceeds document length ${lineCount}`);
        }
        if (op.startLine && op.endLine && op.startLine > op.endLine) {
          errors.push(`${op.type}: startLine ${op.startLine} > endLine ${op.endLine}`);
        }
        break;

      case "insert":
        if (op.afterLine === undefined || op.afterLine < 0) {
          errors.push("insert: afterLine must be >= 0");
        }
        if (op.afterLine && op.afterLine > lineCount) {
          errors.push(`insert: afterLine ${op.afterLine} exceeds document length ${lineCount}`);
        }
        if (!op.content && !op.newContent) {
          errors.push("insert: content is required");
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 3. Monaco Diff Integration

Create `src/lib/canvas/monacoEdits.ts`:

```typescript
import type { editor } from "monaco-editor";
import type { DiffOperation } from "./diff";

/**
 * Convert DiffOperations to Monaco edit operations
 */
export function diffToMonacoEdits(
  model: editor.ITextModel,
  operations: DiffOperation[]
): editor.IIdentifiedSingleEditOperation[] {
  const edits: editor.IIdentifiedSingleEditOperation[] = [];

  for (const op of operations) {
    switch (op.type) {
      case "delete": {
        const startLine = op.startLine ?? 1;
        const endLine = op.endLine ?? startLine;
        edits.push({
          range: {
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: model.getLineLength(endLine) + 1,
          },
          text: null, // Delete
        });
        break;
      }

      case "insert": {
        const afterLine = op.afterLine ?? 0;
        const content = op.content ?? op.newContent ?? "";
        edits.push({
          range: {
            startLineNumber: afterLine + 1,
            startColumn: 1,
            endLineNumber: afterLine + 1,
            endColumn: 1,
          },
          text: content.endsWith("\n") ? content : content + "\n",
        });
        break;
      }

      case "replace": {
        const startLine = op.startLine ?? 1;
        const endLine = op.endLine ?? startLine;
        const content = op.content ?? op.newContent ?? "";
        edits.push({
          range: {
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: model.getLineLength(endLine) + 1,
          },
          text: content,
        });
        break;
      }
    }
  }

  return edits;
}

/**
 * Apply diff operations directly to Monaco editor
 */
export function applyDiffToMonaco(
  editor: editor.IStandaloneCodeEditor,
  operations: DiffOperation[]
): { success: boolean; error?: string } {
  try {
    const model = editor.getModel();
    if (!model) {
      return { success: false, error: "No model attached to editor" };
    }

    const edits = diffToMonacoEdits(model, operations);

    // Apply all edits as single undoable operation
    editor.executeEdits("canvas-diff", edits);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Track content changes and compute diffs
 * Returns a function to get diff since tracking started
 */
export function createChangeTracker(editor: editor.IStandaloneCodeEditor) {
  let baseContent = editor.getValue();
  let disposable: editor.IDisposable | null = null;

  const startTracking = () => {
    baseContent = editor.getValue();
  };

  const getDiff = () => {
    const currentContent = editor.getValue();
    return {
      hasChanges: currentContent !== baseContent,
      baseContent,
      currentContent,
    };
  };

  const resetBase = () => {
    baseContent = editor.getValue();
  };

  const dispose = () => {
    disposable?.dispose();
  };

  return {
    startTracking,
    getDiff,
    resetBase,
    dispose,
  };
}
```

### 4. Update Apply Diff Tool

Update `convex/ai/tools/updateDocument.ts` to support diff operations:

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

const diffOperationSchema = z.object({
  type: z.enum(["replace", "insert", "delete"]),
  startLine: z.number().optional().describe("Start line (1-indexed) for replace/delete"),
  endLine: z.number().optional().describe("End line (1-indexed, inclusive) for replace/delete"),
  afterLine: z.number().optional().describe("Line after which to insert (0 = start of file)"),
  content: z.string().optional().describe("New content for replace/insert"),
});

export function updateDocumentTool(ctx: ActionCtx, conversationId: string) {
  return tool({
    description: `Update the Canvas document using diff operations. This is more efficient than sending full content.

**Diff Operation Types:**
1. **replace**: Replace lines startLine to endLine with new content
2. **insert**: Insert content after specified line (afterLine=0 inserts at start)
3. **delete**: Remove lines from startLine to endLine

**Examples:**
- Change line 5: { type: "replace", startLine: 5, endLine: 5, content: "new line content" }
- Insert after line 10: { type: "insert", afterLine: 10, content: "new content\\nmore lines" }
- Delete lines 3-5: { type: "delete", startLine: 3, endLine: 5 }

**Best Practices:**
- Use replace for changing existing content
- Use insert for adding new sections
- Use delete for removing sections
- Order doesn't matter (operations are sorted internally)
- Line numbers are 1-indexed`,

    parameters: z.object({
      operations: z.array(diffOperationSchema).describe("Array of diff operations to apply"),
      changeDescription: z.string().describe("Human-readable description of changes"),
    }),

    execute: async ({ operations, changeDescription }) => {
      try {
        // Get active document
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

        // Apply diff operations
        // @ts-ignore - Type depth workaround
        const result = await (ctx.runMutation as any)(
          internal.canvas.documents.applyDiff,
          {
            documentId: document._id,
            operations,
            changeDescription,
          }
        );

        return {
          success: true,
          documentId: document._id,
          newVersion: result.version,
          operationsApplied: result.applied,
          operationsFailed: result.failed,
          changeDescription,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to apply diff",
        };
      }
    },
  });
}
```

### 5. Add Diff Mutation to Convex

Update `convex/canvas/documents.ts`:

```typescript
import { applyDiffOperations, validateDiffOperations, type DiffOperation } from "@/lib/canvas/diff";

// Define schema for diff operation
const diffOperationValidator = v.object({
  type: v.union(v.literal("replace"), v.literal("insert"), v.literal("delete")),
  startLine: v.optional(v.number()),
  endLine: v.optional(v.number()),
  afterLine: v.optional(v.number()),
  content: v.optional(v.string()),
  newContent: v.optional(v.string()),
});

export const applyDiff = internalMutation({
  args: {
    documentId: v.id("canvasDocuments"),
    operations: v.array(diffOperationValidator),
    changeDescription: v.string(),
  },
  handler: async (ctx, { documentId, operations, changeDescription }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new Error("Document not found");

    // Validate operations
    const validation = validateDiffOperations(doc.content, operations as DiffOperation[]);
    if (!validation.valid) {
      throw new Error(`Invalid diff: ${validation.errors.join(", ")}`);
    }

    // Apply operations
    const { result, applied, failed } = applyDiffOperations(
      doc.content,
      operations as DiffOperation[]
    );

    if (failed.length > 0 && applied === 0) {
      throw new Error(`All operations failed: ${failed.join(", ")}`);
    }

    const newVersion = doc.version + 1;
    const now = Date.now();

    // Update document
    await ctx.db.patch(documentId, {
      content: result,
      version: newVersion,
      updatedAt: now,
    });

    // Store diff in history
    await ctx.db.insert("canvasHistory", {
      documentId,
      userId: doc.userId,
      content: result,
      version: newVersion,
      source: "llm_diff",
      diff: JSON.stringify({ operations, changeDescription }),
      createdAt: now,
    });

    return {
      version: newVersion,
      applied,
      failed,
    };
  },
});
```

### 6. Diff Grabber for User Edits

Create `src/hooks/useCanvasDiffTracker.ts`:

```typescript
import { useRef, useCallback, useEffect } from "react";
import type { editor } from "monaco-editor";
import { computeDiff } from "@/lib/canvas/diff";
import type { Doc } from "@/convex/_generated/dataModel";

interface DiffTrackerResult {
  hasChanges: boolean;
  diff: ReturnType<typeof computeDiff> | null;
  baseContent: string;
  currentContent: string;
}

/**
 * Track user edits in Monaco and compute diffs
 * Use this to inform the LLM about user changes
 *
 * NOTE: Receives document as prop (not from context) to keep context simple
 */
export function useCanvasDiffTracker(
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>,
  document: Doc<"canvasDocuments"> | null
) {
  const baseContentRef = useRef<string>("");
  const lastSyncedVersionRef = useRef<number>(0);

  // Update base content when document version changes (LLM updated)
  useEffect(() => {
    if (document && document.version !== lastSyncedVersionRef.current) {
      baseContentRef.current = document.content;
      lastSyncedVersionRef.current = document.version;
    }
  }, [document?.version, document?.content]);

  // Get diff between base (last LLM version) and current editor content
  const getUserDiff = useCallback((): DiffTrackerResult => {
    const editor = editorRef.current;
    if (!editor) {
      return {
        hasChanges: false,
        diff: null,
        baseContent: "",
        currentContent: "",
      };
    }

    const currentContent = editor.getValue();
    const baseContent = baseContentRef.current;

    if (currentContent === baseContent) {
      return {
        hasChanges: false,
        diff: null,
        baseContent,
        currentContent,
      };
    }

    return {
      hasChanges: true,
      diff: computeDiff(baseContent, currentContent),
      baseContent,
      currentContent,
    };
  }, [editorRef]);

  // Reset base to current content (call after user diff is processed)
  const resetBase = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      baseContentRef.current = editor.getValue();
    }
  }, [editorRef]);

  return {
    getUserDiff,
    resetBase,
  };
}
```

### 7. Include User Diffs in Chat Context

Update message sending to include user diffs:

```typescript
// In the chat send message flow, include user diffs:

// src/hooks/useSendMessage.ts or similar
import { useCanvasDiffTracker } from "./useCanvasDiffTracker";

// When sending a message (document from useQuery, not context):
const { getUserDiff } = useCanvasDiffTracker(editorRef, document);
const userDiff = getUserDiff();

if (userDiff.hasChanges && userDiff.diff) {
  // Append diff info to message or include as tool context
  const diffContext = `
[User made manual edits to the document]
Changes: ${userDiff.diff.summary}
Operations:
${JSON.stringify(userDiff.diff.operations, null, 2)}
`;
  // Include in message context...
}
```

### 8. Visual Diff Indicators

Add visual feedback for changes in Monaco:

```typescript
// In CanvasEditor.tsx, add decorations for pending changes

import { useEffect, useRef } from "react";
import type { editor } from "monaco-editor";

function useChangeHighlighting(
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>,
  monacoRef: React.RefObject<Monaco | null>
) {
  const decorationsRef = useRef<string[]>([]);

  const highlightChangedLines = useCallback((
    changedLines: number[]
  ) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations = changedLines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "line-changed",
        glyphMarginClassName: "glyph-changed",
      },
    }));

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [editorRef, monacoRef]);

  const clearHighlights = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      []
    );
  }, [editorRef]);

  return { highlightChangedLines, clearHighlights };
}

// Add CSS for highlighting
// In globals.css or component styles:
/*
.line-changed {
  background-color: rgba(255, 255, 0, 0.1);
}
.glyph-changed::before {
  content: "";
  display: block;
  width: 4px;
  height: 100%;
  background-color: #f0ad4e;
}
*/
```

---

## Tool Prompt Update

Add diff instructions to system prompt:

```typescript
// In src/lib/prompts/documentTools.ts

export const DIFF_INSTRUCTIONS = `
## Using Diff Operations

When updating documents, use diff operations instead of full content:

### Operation Types:
1. **replace**: Replace lines startLine to endLine
   Example: { type: "replace", startLine: 5, endLine: 7, content: "new code" }

2. **insert**: Add content after a line
   Example: { type: "insert", afterLine: 10, content: "// New section\\ncode here" }

3. **delete**: Remove lines
   Example: { type: "delete", startLine: 3, endLine: 5 }

### Guidelines:
- Line numbers are 1-indexed (first line = 1)
- afterLine: 0 inserts at the start of the file
- Content can include multiple lines with \\n
- Multiple operations can be sent together
- Operations are applied from bottom to top (safe ordering)

### When User Edits Manually:
If the conversation includes "[User made manual edits]", acknowledge their changes
and work from the updated content. Use readDocument if needed.
`;
```

---

## File Structure

After this phase:

```
src/
├── lib/
│   └── canvas/
│       ├── diff.ts           # NEW - Diff computation/application
│       └── monacoEdits.ts    # NEW - Monaco integration
├── hooks/
│   └── useCanvasDiffTracker.ts  # NEW - Track user edits

convex/
├── canvas/
│   └── documents.ts          # Updated with applyDiff mutation
├── ai/
│   └── tools/
│       └── updateDocument.ts # Updated to use diff operations
```

---

## Testing Checklist

### Diff Computation
- [ ] `computeDiff("a\nb\nc", "a\nx\nc")` returns replace operation for line 2
- [ ] `computeDiff("a\nb", "a\nb\nc")` returns insert operation
- [ ] `computeDiff("a\nb\nc", "a\nc")` returns delete operation
- [ ] Complex changes produce multiple operations

### Diff Application
- [ ] Replace operation updates correct lines
- [ ] Insert at line 0 prepends content
- [ ] Insert at end appends content
- [ ] Delete removes correct lines
- [ ] Multiple operations apply correctly (bottom-to-top)
- [ ] Invalid line numbers return errors, don't corrupt document

### Monaco Integration
- [ ] `applyDiffToMonaco` updates editor content
- [ ] Undo (Ctrl+Z) reverts diff application
- [ ] Cursor position preserved when possible

### LLM Tool Usage
- [ ] LLM can send diff operations via `updateDocument`
- [ ] Operations apply correctly to document
- [ ] Version increments
- [ ] History entry includes diff JSON

### User Edit Tracking
- [ ] `getUserDiff()` detects manual changes
- [ ] Diff summary included in message context
- [ ] Base content resets after LLM update

---

## Performance Notes

1. **Operation ordering**: Apply from bottom to top to avoid line number shifting
2. **Batched edits**: Monaco's `executeEdits` applies all changes atomically
3. **Large diffs**: `diff` library handles files with thousands of lines efficiently
4. **Memory**: Store diffs, not full snapshots, in history for space efficiency

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Line number out of bounds | Validation catches, returns error |
| Overlapping operations | Apply order (bottom-to-top) prevents conflicts |
| Empty content | Allowed for delete, not for insert/replace |
| Network failure mid-apply | Atomic Convex mutation - all or nothing |

---

## References

- `diff` npm package: https://www.npmjs.com/package/diff
- Google diff-match-patch: https://github.com/google/diff-match-patch
- Monaco executeEdits: https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.IStandaloneCodeEditor.html#executeEdits
