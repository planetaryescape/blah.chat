# Phase 3: Summarize Popover

## Overview

Replace current "Summarize" action (inserts system message) with ephemeral popover that shows summary and allows saving as note.

**Dependencies**:
- Phase 1 (notes CRUD)
- Phase 2 (CreateNoteDialog)

**Estimated Time**: 1 day

---

## Goals

1. Create `SummarizePopover` component (ephemeral UI)
2. Update `SelectionContextMenu` to show popover instead of inserting message
3. Modify `convex/generation.ts::summarizeSelection` to return summary (not insert)
4. Implement popover positioning relative to text selection
5. Add "Save as Note" flow from popover

---

## Background: Current Implementation

**File**: `src/components/chat/SelectionContextMenu.tsx` (lines 109-122)

Current flow:
1. User selects text → context menu appears
2. Click "Summarize" → toast "Generating summary..."
3. LLM generates summary
4. **Summary inserted as system message in conversation**
5. Toast "Summary generated"

**Problem**: System messages clutter conversation history. Better UX: show summary in popover, let user decide to save.

**New flow**:
1. User selects text → context menu appears
2. Click "Summarize" → popover appears at selection
3. Show loading state in popover
4. LLM returns summary → display in popover
5. User can:
   - Click "Save as Note" → opens CreateNoteDialog
   - Click "Dismiss" → popover closes (ephemeral)
   - Click outside → popover closes

---

## Implementation Steps

### 1. Install shadcn Popover

```bash
bunx shadcn@latest add popover
```

This installs:
- `src/components/ui/popover.tsx`
- Dependencies: `@radix-ui/react-popover`

### 2. Update Convex Action

**File**: `convex/generation.ts`

**Current** (lines 588-631):
```typescript
export const summarizeSelection = action({
  args: {
    text: v.string(),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // ... user/message lookup ...

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [/* summary prompt */],
    });

    // PROBLEM: Inserts as system message
    await ctx.runMutation(internal.messages.create, {
      conversationId: sourceMessage.conversationId,
      userId: user._id,
      role: "system",
      content: `Summary: ${result.text}`,
      status: "complete",
    });

    return result.text;
  }
});
```

**New version**:
```typescript
export const summarizeSelection = action({
  args: {
    text: v.string(),
    // REMOVED: messageId (don't need conversation context anymore)
  },
  handler: async (ctx, { text }) => {
    // No user/message lookup needed - just generate summary

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that provides concise summaries. Summarize the following text in 1-2 sentences, focusing on the key points.",
        },
        {
          role: "user",
          content: `Summarize this text:\n\n${text}`,
        },
      ],
    });

    // CHANGE: Return summary instead of inserting
    return { summary: result.text };
  },
});
```

### 3. Create SummarizePopover Component

**File**: `src/components/notes/SummarizePopover.tsx` (NEW)

```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface SummarizePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  sourceMessageId?: Id<"messages">;
  sourceConversationId?: Id<"conversations">;
  position: { top: number; left: number };
  onSaveAsNote: (summary: string) => void;
}

export function SummarizePopover({
  open,
  onOpenChange,
  selectedText,
  sourceMessageId,
  sourceConversationId,
  position,
  onSaveAsNote,
}: SummarizePopoverProps) {
  const summarize = useAction(api.generation.summarizeSelection);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate summary when popover opens
  useEffect(() => {
    if (open && !summary) {
      generateSummary();
    }
  }, [open]);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await summarize({ text: selectedText });
      setSummary(result.summary);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setError("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsNote = () => {
    if (summary) {
      onSaveAsNote(summary);
      onOpenChange(false);
    }
  };

  const handleDismiss = () => {
    onOpenChange(false);
    // Reset state when dismissed
    setSummary(null);
    setError(null);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* Invisible trigger positioned at selection */}
      <PopoverTrigger asChild>
        <div
          className="fixed pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        />
      </PopoverTrigger>

      <PopoverContent
        className="w-96"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Summary</h4>

            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive">
                {error}
                <Button
                  variant="link"
                  size="sm"
                  onClick={generateSummary}
                  className="p-0 h-auto ml-2"
                >
                  Try again
                </Button>
              </div>
            )}

            {summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {summary}
              </p>
            )}
          </div>

          {summary && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAsNote}
              >
                Save as Note
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 4. Update SelectionContextMenu

**File**: `src/components/chat/SelectionContextMenu.tsx`

Add imports:
```typescript
import { SummarizePopover } from "@/components/notes/SummarizePopover";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
```

Add state (after existing useState declarations):
```typescript
const [showSummarizePopover, setShowSummarizePopover] = useState(false);
const [showCreateNote, setShowCreateNote] = useState(false);
const [summaryText, setSummaryText] = useState("");
const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
```

**Replace** `handleSummarize` function (lines 109-122):

```typescript
const handleSummarize = () => {
  // Calculate popover position from selection rect
  if (selection.rect) {
    const rect = selection.rect;
    setPopoverPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });
  }

  setShowSummarizePopover(true);
  clearSelection(); // Clear selection menu (popover will stay)
};
```

Add handler for save as note from popover:
```typescript
const handleSaveAsNoteFromSummary = (summary: string) => {
  setSummaryText(summary);
  setShowSummarizePopover(false);
  setShowCreateNote(true);
};
```

Update return statement to include popovers (after the main context menu portal):

```typescript
return (
  <>
    {createPortal(menu, document.body)}

    {/* Summarize Popover */}
    <SummarizePopover
      open={showSummarizePopover}
      onOpenChange={setShowSummarizePopover}
      selectedText={selection.text}
      sourceMessageId={selection.messageId as Id<"messages">}
      sourceConversationId={undefined} // Can get from message if needed
      position={popoverPosition}
      onSaveAsNote={handleSaveAsNoteFromSummary}
    />

    {/* Create Note Dialog */}
    <CreateNoteDialog
      open={showCreateNote}
      onOpenChange={setShowCreateNote}
      initialContent={summaryText}
      sourceMessageId={selection.messageId as Id<"messages">}
      sourceSelectionText={selection.text}
    />
  </>
);
```

### 5. Add Skeleton Component (if not exists)

```bash
bunx shadcn@latest add skeleton
```

---

## Testing Checklist

- [ ] Select text in message
- [ ] Click "Summarize" from context menu
- [ ] Popover appears near selection
- [ ] Loading skeleton shows while generating
- [ ] Summary displays in popover
- [ ] "Dismiss" button closes popover (no save)
- [ ] Click outside closes popover
- [ ] "Save as Note" opens CreateNoteDialog
- [ ] CreateNoteDialog pre-filled with summary
- [ ] Can save summary as note
- [ ] No system messages inserted in conversation
- [ ] Error state shows if summarization fails
- [ ] "Try again" button works after error

---

## Positioning Logic

### Selection Rect Calculation

The `selection.rect` from `SelectionContext` provides:
```typescript
{
  top: number,    // Distance from top of viewport
  left: number,   // Distance from left of viewport
  bottom: number, // Distance from top + height
  right: number,  // Distance from left + width
  width: number,
  height: number
}
```

### Popover Positioning

```typescript
// Position below selection with small gap
const position = {
  top: rect.bottom + window.scrollY + 8, // 8px gap
  left: rect.left + window.scrollX,
};
```

**Radix Popover** (via shadcn) handles:
- Viewport collision detection
- Auto-flipping (if no space below, shows above)
- Boundary awareness

Set via `side="bottom"` and `align="start"` props.

---

## Files Created/Modified

### Created
- `src/components/notes/SummarizePopover.tsx`

### Modified
- `convex/generation.ts` (update `summarizeSelection` action)
- `src/components/chat/SelectionContextMenu.tsx` (integrate popover)

---

## Dependencies

**shadcn Components**:
- `popover` (install via `bunx shadcn@latest add popover`)
- `skeleton` (install via `bunx shadcn@latest add skeleton`)

**Convex APIs Used**:
- `api.generation.summarizeSelection` (modified to return summary)
- `api.notes.createNote` (from Phase 1)

**External Libraries**:
- `@radix-ui/react-popover` (via shadcn)

---

## User Experience Flow

```
1. User highlights text in message
   ↓
2. Selection context menu appears
   ↓
3. User clicks "Summarize"
   ↓
4. Popover appears at selection (menu disappears)
   ↓
5. Loading state shows (skeleton)
   ↓
6. LLM generates summary (gpt-4o-mini, ~1-2s)
   ↓
7. Summary appears in popover
   ↓
8a. User clicks "Dismiss" → popover closes, done
   OR
8b. User clicks "Save as Note" → CreateNoteDialog opens
   ↓
9. User edits/saves note → redirected to /notes page
```

---

## Next Steps

After Phase 3:
- **Phase 4**: Build full Tiptap editor with toolbar and auto-save
- **Phase 5**: Add AI tag extraction and hybrid search
