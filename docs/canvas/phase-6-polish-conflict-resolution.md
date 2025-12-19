# Phase 6: Polish & Conflict Resolution

## Overview

This final phase polishes the Canvas feature with production-ready UX, handles edge cases like merge conflicts, and adds undo/redo capabilities. This is where we address the "what if something goes wrong?" scenarios discussed in the original planning conversation.

## Context

### What This Phase Addresses

From the original discussion:
> "In the initial version, we don't really concern ourselves about any complex merge conflict resolution. This is a 10x10 app. If at all there is ever a conflict in applying a diff, we just tell the LLM that there is a conflict here, and either resolve this conflict automatically, or if there's something that you can't resolve automatically, ask the user which version they would prefer."

This phase implements exactly that:
1. **Conflict detection**: Know when diffs can't be cleanly applied
2. **LLM-guided resolution**: Tell LLM about conflict, let it decide
3. **User choice fallback**: If LLM can't resolve, present options to user
4. **Undo/redo**: Let users revert changes if something goes wrong

### Types of Conflicts

| Conflict Type | Cause | Resolution Strategy |
|--------------|-------|---------------------|
| **Line Mismatch** | LLM's line numbers don't match current document | LLM reads current version, sends new diff |
| **Content Drift** | User edited while LLM was generating | Merge or ask user to choose |
| **Concurrent Edits** | User and LLM edit at same time | Block one, apply other |
| **Invalid Diff** | Malformed diff operations | Reject, ask LLM to retry |

## Prerequisites

- **Phase 1-5**: Complete Canvas foundation, editor, tools, diff system, modes

## What Comes After

This is the final phase. After this:
- Feature is production-ready
- Monitor for edge cases in real usage
- Consider future enhancements (real-time collab, branching)

---

## Scope

### In Scope

1. Conflict detection during diff application
2. LLM-guided conflict resolution
3. User conflict resolution UI
4. Version-based undo/redo
5. Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
6. Document toolbar enhancements
7. Loading states and animations
8. Error boundaries and recovery

### Out of Scope

- Real-time collaborative editing (future)
- Git-style branching/merging (future)
- Offline support (future)

---

## Implementation

### 1. Enhanced Diff Application with Conflict Detection

Update `src/lib/canvas/diff.ts`:

```typescript
export interface DiffConflict {
  operation: DiffOperation;
  reason: string;
  suggestion: "retry" | "manual" | "skip";
  context?: {
    expectedContent?: string;
    actualContent?: string;
    lineNumber?: number;
  };
}

export interface ApplyDiffResult {
  success: boolean;
  result: string;
  applied: number;
  skipped: number;
  conflicts: DiffConflict[];
}

/**
 * Apply diff operations with conflict detection
 */
export function applyDiffOperationsWithConflicts(
  text: string,
  operations: DiffOperation[],
  options: {
    strict?: boolean;  // Fail on any conflict
    fuzzyMatch?: boolean;  // Try to match content even if lines shifted
  } = {}
): ApplyDiffResult {
  const lines = text.split("\n");
  const conflicts: DiffConflict[] = [];
  let applied = 0;
  let skipped = 0;

  // Sort operations by line number descending
  const sortedOps = [...operations].sort((a, b) => {
    const lineA = a.startLine ?? a.afterLine ?? 0;
    const lineB = b.startLine ?? b.afterLine ?? 0;
    return lineB - lineA;
  });

  for (const op of sortedOps) {
    const conflict = detectConflict(lines, op);

    if (conflict) {
      conflicts.push(conflict);

      if (options.strict) {
        skipped++;
        continue;
      }

      // Try fuzzy resolution if enabled
      if (options.fuzzyMatch && conflict.suggestion === "retry") {
        const resolved = tryFuzzyResolve(lines, op);
        if (resolved) {
          applyOperation(lines, resolved);
          applied++;
          continue;
        }
      }

      skipped++;
      continue;
    }

    // No conflict, apply operation
    applyOperation(lines, op);
    applied++;
  }

  return {
    success: conflicts.length === 0 || applied > 0,
    result: lines.join("\n"),
    applied,
    skipped,
    conflicts,
  };
}

/**
 * Detect if an operation will conflict with current document state
 */
function detectConflict(
  lines: string[],
  op: DiffOperation
): DiffConflict | null {
  const lineCount = lines.length;

  switch (op.type) {
    case "delete":
    case "replace": {
      const start = (op.startLine ?? 1) - 1;
      const end = (op.endLine ?? op.startLine ?? 1) - 1;

      // Check bounds
      if (start < 0 || end >= lineCount) {
        return {
          operation: op,
          reason: `Lines ${op.startLine}-${op.endLine} out of bounds (document has ${lineCount} lines)`,
          suggestion: "retry",
          context: { lineNumber: op.startLine },
        };
      }

      // For replace, check if content looks significantly different
      // (might indicate user edited that section)
      if (op.type === "replace") {
        const targetLines = lines.slice(start, end + 1).join("\n");
        // Heuristic: if target is very different from what we expect, flag it
        // This is a simple check - could be enhanced with similarity scoring
        if (targetLines.length === 0 && (op.content?.length ?? 0) > 50) {
          return {
            operation: op,
            reason: "Target lines are empty but replacement is substantial - document may have changed",
            suggestion: "manual",
            context: {
              actualContent: targetLines,
              lineNumber: op.startLine,
            },
          };
        }
      }
      break;
    }

    case "insert": {
      const afterLine = op.afterLine ?? 0;
      if (afterLine < 0 || afterLine > lineCount) {
        return {
          operation: op,
          reason: `Insert position ${afterLine} out of bounds (document has ${lineCount} lines)`,
          suggestion: "retry",
          context: { lineNumber: afterLine },
        };
      }
      break;
    }
  }

  return null;
}

/**
 * Try to resolve conflict by finding content elsewhere in document
 */
function tryFuzzyResolve(
  lines: string[],
  op: DiffOperation
): DiffOperation | null {
  // Simple implementation: try to find the line that was supposed to be at startLine
  // This is a basic fuzzy match - could be enhanced with diff-match-patch's match function
  return null; // For MVP, return null and escalate to user
}

function applyOperation(lines: string[], op: DiffOperation): void {
  switch (op.type) {
    case "delete": {
      const start = (op.startLine ?? 1) - 1;
      const end = (op.endLine ?? op.startLine ?? 1) - 1;
      lines.splice(start, end - start + 1);
      break;
    }
    case "insert": {
      const afterLine = op.afterLine ?? 0;
      const content = op.content ?? op.newContent ?? "";
      const newLines = content.split("\n").filter((l, i, arr) =>
        i < arr.length - 1 || l !== ""
      );
      lines.splice(afterLine, 0, ...newLines);
      break;
    }
    case "replace": {
      const start = (op.startLine ?? 1) - 1;
      const end = (op.endLine ?? op.startLine ?? 1) - 1;
      const content = op.content ?? op.newContent ?? "";
      const newLines = content.split("\n").filter((l, i, arr) =>
        i < arr.length - 1 || l !== ""
      );
      lines.splice(start, end - start + 1, ...newLines);
      break;
    }
  }
}
```

### 2. Conflict Resolution Tool for LLM

Create `convex/ai/tools/resolveConflict.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";

export function resolveConflictTool(ctx: ActionCtx, conversationId: string) {
  return tool({
    description: `Handle a diff conflict that occurred when applying changes.

Called automatically when updateDocument encounters conflicts.

**Options:**
1. **retry_with_read**: Read current document state and generate new diffs
2. **force_replace**: Replace conflicting sections entirely (may lose user edits)
3. **ask_user**: Present conflict to user for manual resolution

Choose based on conflict severity and whether user data might be lost.`,

    parameters: z.object({
      strategy: z.enum(["retry_with_read", "force_replace", "ask_user"]),
      conflictDescription: z.string().describe("Describe what went wrong"),
      proposedFix: z.string().optional().describe("For retry: what you'll do differently"),
    }),

    execute: async ({ strategy, conflictDescription, proposedFix }) => {
      // This tool primarily serves as a decision point for the LLM
      // The actual resolution happens based on the chosen strategy

      switch (strategy) {
        case "retry_with_read":
          return {
            action: "retry",
            message: "Please use readDocument to get current content, then send new diffs.",
            conflictDescription,
            proposedFix,
          };

        case "force_replace":
          return {
            action: "force",
            message: "Will replace content. User edits in conflicting sections may be lost.",
            warning: "This may overwrite user changes.",
            conflictDescription,
          };

        case "ask_user":
          return {
            action: "ask_user",
            message: "Please ask the user how they want to resolve this conflict.",
            conflictDescription,
            suggestUserOptions: [
              "Keep my version",
              "Use your (AI) version",
              "Show me both and let me decide",
            ],
          };
      }
    },
  });
}
```

### 3. User Conflict Resolution UI

Create `src/components/canvas/ConflictDialog.tsx`:

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Bot, GitMerge } from "lucide-react";
import { useState } from "react";

interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  conflict: {
    description: string;
    userContent: string;
    aiContent: string;
    lineRange?: { start: number; end: number };
  };
  onResolve: (choice: "user" | "ai" | "merge") => void;
}

export function ConflictDialog({
  open,
  onClose,
  conflict,
  onResolve,
}: ConflictDialogProps) {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Edit Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {conflict.description}
            {conflict.lineRange && (
              <span className="block mt-1 text-xs">
                Lines {conflict.lineRange.start}-{conflict.lineRange.end}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {showComparison && (
          <div className="grid grid-cols-2 gap-4 my-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <FileText className="w-4 h-4" />
                Your Version
              </div>
              <pre className="p-3 rounded bg-muted text-xs overflow-auto max-h-48">
                {conflict.userContent}
              </pre>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Bot className="w-4 h-4" />
                AI Version
              </div>
              <pre className="p-3 rounded bg-muted text-xs overflow-auto max-h-48">
                {conflict.aiContent}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? "Hide" : "Show"} Comparison
          </Button>

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onResolve("user")}>
              <FileText className="w-4 h-4 mr-2" />
              Keep Mine
            </Button>
            <Button variant="outline" onClick={() => onResolve("ai")}>
              <Bot className="w-4 h-4 mr-2" />
              Use AI's
            </Button>
            <Button onClick={() => onResolve("merge")}>
              <GitMerge className="w-4 h-4 mr-2" />
              Merge Both
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Version-Based Undo/Redo

Create `src/hooks/useCanvasHistory.ts`:

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCallback, useState } from "react";

/**
 * Hook for managing document version history
 *
 * NOTE: Doesn't use context - calls mutations directly
 */
export function useCanvasHistory(documentId: Id<"canvasDocuments"> | undefined) {
  const [currentVersionOffset, setCurrentVersionOffset] = useState(0);

  // Get version history
  const history = useQuery(
    api.canvas.history.getHistory,
    documentId ? { documentId, limit: 50 } : "skip"
  );

  const currentDocument = useQuery(
    api.canvas.documents.get,
    documentId ? { documentId } : "skip"
  );

  // Mutation for updating content
  const updateContentMutation = useMutation(api.canvas.documents.updateContent);

  const canUndo = history && history.length > 1 && currentVersionOffset < history.length - 1;
  const canRedo = currentVersionOffset > 0;

  const undo = useCallback(async () => {
    if (!canUndo || !history || !documentId) return;

    const targetVersion = history[currentVersionOffset + 1];
    if (!targetVersion) return;

    await updateContentMutation({
      documentId,
      content: targetVersion.content,
      source: "user_edit",
      diff: "Undo",
    });
    setCurrentVersionOffset((prev) => prev + 1);
  }, [canUndo, history, currentVersionOffset, documentId, updateContentMutation]);

  const redo = useCallback(async () => {
    if (!canRedo || !history || !documentId) return;

    const targetVersion = history[currentVersionOffset - 1];
    if (!targetVersion) return;

    await updateContentMutation({
      documentId,
      content: targetVersion.content,
      source: "user_edit",
      diff: "Redo",
    });
    setCurrentVersionOffset((prev) => prev - 1);
  }, [canRedo, history, currentVersionOffset, documentId, updateContentMutation]);

  // Jump to specific version
  const jumpToVersion = useCallback(async (version: number) => {
    if (!history || !documentId) return;

    const targetEntry = history.find((h) => h.version === version);
    if (!targetEntry) return;

    await updateContentMutation({
      documentId,
      content: targetEntry.content,
      source: "user_edit",
      diff: `Restore v${version}`,
    });
    const newOffset = history.findIndex((h) => h.version === version);
    setCurrentVersionOffset(newOffset);
  }, [history, documentId, updateContentMutation]);

  // Reset offset when document changes externally
  const resetOffset = useCallback(() => {
    setCurrentVersionOffset(0);
  }, []);

  return {
    history,
    currentVersion: currentDocument?.version ?? 0,
    canUndo,
    canRedo,
    undo,
    redo,
    jumpToVersion,
    resetOffset,
  };
}
```

### 5. Keyboard Shortcuts

Create `src/hooks/useCanvasKeyboardShortcuts.ts`:

```typescript
import { useEffect } from "react";
import { useCanvasHistory } from "./useCanvasHistory";
import type { Id } from "@/convex/_generated/dataModel";

export function useCanvasKeyboardShortcuts(
  documentId: Id<"canvasDocuments"> | undefined,
  enabled: boolean = true
) {
  const { undo, redo, canUndo, canRedo } = useCanvasHistory(documentId);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Z (Undo)
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
      }

      // Check for Cmd/Ctrl + Shift + Z (Redo)
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }

      // Also support Cmd/Ctrl + Y for Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, canUndo, canRedo, undo, redo]);
}
```

### 6. Enhanced Canvas Toolbar

Update `src/components/canvas/CanvasToolbar.tsx`:

```typescript
"use client";

import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import { useCanvasKeyboardShortcuts } from "@/hooks/useCanvasKeyboardShortcuts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import {
  Undo2,
  Redo2,
  Save,
  Download,
  Copy,
  History,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  documentId: Id<"canvasDocuments"> | null;
  className?: string;
}

/**
 * NOTE: Doesn't use context - queries document directly
 */
export function CanvasToolbar({ documentId, className }: CanvasToolbarProps) {
  // Query document directly (not from context)
  const document = useQuery(
    api.canvas.documents.get,
    documentId ? { documentId } : "skip"
  );

  const {
    canUndo,
    canRedo,
    undo,
    redo,
    history,
    currentVersion,
  } = useCanvasHistory(documentId ?? undefined);

  // Enable keyboard shortcuts
  useCanvasKeyboardShortcuts(documentId ?? undefined, true);

  const handleCopy = async () => {
    if (document?.content) {
      await navigator.clipboard.writeText(document.content);
    }
  };

  const handleDownload = () => {
    if (!document) return;

    const extension = document.documentType === "code"
      ? getFileExtension(document.language)
      : ".md";

    const blob = new Blob([document.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title}${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30", className)}>
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Version indicator */}
      <span className="text-xs text-muted-foreground px-2">
        v{currentVersion}
      </span>

      <div className="flex-1" />

      {/* Actions */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy to clipboard</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download file</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <History className="h-4 w-4 mr-2" />
            View history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">
            Delete document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getFileExtension(language?: string): string {
  const extensions: Record<string, string> = {
    typescript: ".ts",
    javascript: ".js",
    python: ".py",
    rust: ".rs",
    go: ".go",
    java: ".java",
    csharp: ".cs",
    cpp: ".cpp",
    c: ".c",
    html: ".html",
    css: ".css",
    json: ".json",
    yaml: ".yaml",
    markdown: ".md",
    sql: ".sql",
    shell: ".sh",
  };
  return extensions[language ?? ""] ?? ".txt";
}
```

### 7. Loading States and Animations

Create `src/components/canvas/CanvasLoadingStates.tsx`:

```typescript
"use client";

import { cn } from "@/lib/utils";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, message }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {message ?? "Loading..."}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <AnimatePresence mode="wait">
        {status === "saving" && (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </motion.div>
        )}
        {status === "saved" && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-green-500"
          >
            <CheckCircle className="w-3 h-3" />
            <span>Saved</span>
          </motion.div>
        )}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-destructive"
          >
            <span>Save failed</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ApplyingDiffIndicatorProps {
  isApplying: boolean;
  operationsCount?: number;
}

export function ApplyingDiffIndicator({
  isApplying,
  operationsCount,
}: ApplyingDiffIndicatorProps) {
  return (
    <AnimatePresence>
      {isApplying && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm flex items-center gap-2 shadow-lg"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>
            Applying changes
            {operationsCount && ` (${operationsCount} operations)`}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 8. Error Boundary for Canvas

Create `src/components/canvas/CanvasErrorBoundary.tsx`:

```typescript
"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Canvas error:", error, errorInfo);
    // TODO: Report to error tracking service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <div>
              <h3 className="font-semibold mb-1">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The Canvas editor encountered an error.
              </p>
              <p className="text-xs text-muted-foreground font-mono mb-4 max-w-md">
                {this.state.error?.message}
              </p>
            </div>
            <Button onClick={this.handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### 9. Version History Panel

Create `src/components/canvas/VersionHistoryPanel.tsx`:

```typescript
"use client";

import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import type { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, User, Bot, Undo2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VersionHistoryPanelProps {
  documentId: Id<"canvasDocuments">;
  onClose: () => void;
}

export function VersionHistoryPanel({
  documentId,
  onClose,
}: VersionHistoryPanelProps) {
  const { history, currentVersion, jumpToVersion } = useCanvasHistory(documentId);

  if (!history) {
    return <div className="p-4">Loading history...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-medium text-sm">Version History</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {history.map((entry) => (
            <div
              key={entry._id}
              className={`p-3 rounded-lg border ${
                entry.version === currentVersion
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {entry.source === "llm_diff" ? (
                      <Bot className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      v{entry.version}
                    </span>
                    {entry.version === currentVersion && (
                      <span className="text-xs text-primary">(current)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                  </div>
                  {entry.diff && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {typeof entry.diff === "string"
                        ? JSON.parse(entry.diff).changeDescription ?? entry.diff
                        : "Changes applied"}
                    </p>
                  )}
                </div>

                {entry.version !== currentVersion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => jumpToVersion(entry.version)}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

---

## File Structure

After this phase:

```
src/
├── lib/
│   └── canvas/
│       └── diff.ts                    # Updated with conflict detection
├── hooks/
│   ├── useCanvasHistory.ts            # NEW
│   └── useCanvasKeyboardShortcuts.ts  # NEW
├── components/
│   └── canvas/
│       ├── CanvasToolbar.tsx          # Updated
│       ├── CanvasLoadingStates.tsx    # NEW
│       ├── CanvasErrorBoundary.tsx    # NEW
│       ├── ConflictDialog.tsx         # NEW
│       └── VersionHistoryPanel.tsx    # NEW

convex/
├── ai/
│   └── tools/
│       └── resolveConflict.ts         # NEW
```

---

## Testing Checklist

### Conflict Detection
- [ ] Out-of-bounds line numbers detected as conflict
- [ ] Content drift flagged when user edited target section
- [ ] Conflict details include context (expected vs actual)

### Conflict Resolution
- [ ] LLM receives conflict info via `resolveConflict` tool
- [ ] "retry" strategy prompts LLM to read and retry
- [ ] "ask_user" strategy shows ConflictDialog
- [ ] User can choose: keep mine, use AI's, merge

### Undo/Redo
- [ ] Cmd+Z undoes last change
- [ ] Cmd+Shift+Z redoes undone change
- [ ] Undo disabled when at oldest version
- [ ] Redo disabled when at newest version
- [ ] Version history shows all changes

### UX Polish
- [ ] Save indicator shows saving/saved states
- [ ] Loading overlay during initial load
- [ ] Diff application shows progress indicator
- [ ] Error boundary catches and displays errors
- [ ] Toolbar has copy, download, history actions

### Keyboard Shortcuts
- [ ] Cmd+Z works in Canvas area
- [ ] Doesn't interfere with Monaco's built-in undo
- [ ] Works on Windows (Ctrl key)

---

## Error Handling Matrix

| Error | Detection | Recovery |
|-------|-----------|----------|
| Network failure during save | Mutation throws | Retry with exponential backoff |
| Invalid diff from LLM | Validation fails | Return error, ask LLM to retry |
| Monaco crashes | Error boundary | Show error, offer reload |
| Version conflict | Version mismatch | Fetch latest, reapply |
| Document deleted externally | Query returns null | Show "document deleted" message |

---

## Performance Considerations

1. **History limit**: Only load last 50 versions to avoid memory bloat
2. **Debounced saves**: Don't save on every keystroke
3. **Lazy load history**: Only fetch when panel opens
4. **Optimistic UI**: Show changes before server confirms

---

## Accessibility

- [ ] Keyboard shortcuts have visible indicators
- [ ] Focus management in dialogs
- [ ] Screen reader announcements for save status
- [ ] High contrast mode support in conflict dialog

---

## Future Enhancements (Post-MVP)

1. **Real-time collaboration**: Multiple users editing same document
2. **Branching**: Create branches for experiments
3. **Diff visualization**: Side-by-side diff view
4. **Export formats**: PDF, DOCX for prose
5. **Templates**: Pre-built document templates

---

## References

- Monaco undo/redo: Built-in, handled separately
- Conflict resolution patterns: Git merge strategies
- Framer Motion: https://www.framer.com/motion/
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
