# Phase 2: Message Actions Integration

## Overview

Refactor message actions to add overflow menu pattern and integrate "Save as Note" functionality.

**Dependencies**: Phase 1 (notes table and CRUD must exist)

**Estimated Time**: 1 day

---

## Goals

1. Refactor `MessageActions` component to show visible + overflow menu
2. Create `MessageActionsMenu` dropdown component
3. Add "Save as Note" button (visible by default)
4. Create `CreateNoteDialog` for save flow
5. Handle mobile responsiveness (collapse all to menu on touch)

---

## Background: Current Implementation

**File**: `src/components/chat/MessageActions.tsx`

Current actions (all visible in horizontal row):
- Copy
- Retry (conditional: failed messages)
- Regenerate (assistant messages)
- Stop (generating messages)
- Branch
- Bookmark
- Delete

**New Design**:
- **Visible**: Copy, Bookmark, **Save as Note** (NEW)
- **Overflow Menu (⋯)**: Regenerate, Branch, Delete
- **Conditional**: Retry/Stop replace Regenerate when applicable

---

## Implementation Steps

### 1. Install shadcn Dropdown Menu

```bash
bunx shadcn@latest add dropdown-menu
```

This installs:
- `src/components/ui/dropdown-menu.tsx`
- Dependencies: `@radix-ui/react-dropdown-menu`

### 2. Create MessageActionsMenu Component

**File**: `src/components/chat/MessageActionsMenu.tsx` (NEW)

```typescript
"use client";

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
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { GitBranch, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface MessageActionsMenuProps {
  message: Doc<"messages">;
  isGenerating: boolean;
  isUser: boolean;
}

export function MessageActionsMenu({
  message,
  isGenerating,
  isUser,
}: MessageActionsMenuProps) {
  const router = useRouter();
  const regenerate = useMutation(api.chat.regenerate);
  const deleteMsg = useMutation(api.chat.deleteMessage);
  const branchFromMessage = useMutation(api.chat.branchFromMessage);

  const handleRegenerate = async () => {
    try {
      await regenerate({ messageId: message._id });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  const handleBranch = async () => {
    try {
      const newConversationId = await branchFromMessage({
        messageId: message._id,
      });
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("Failed to branch:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMsg({ messageId: message._id });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>More actions</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-48">
        {/* Regenerate - only for assistant messages when not generating */}
        {!isUser && !isGenerating && (
          <>
            <DropdownMenuItem onClick={handleRegenerate}>
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Regenerate</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Branch */}
        <DropdownMenuItem onClick={handleBranch}>
          <GitBranch className="mr-2 h-4 w-4" />
          <span>Branch conversation</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Delete */}
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3. Create CreateNoteDialog Component

**File**: `src/components/notes/CreateNoteDialog.tsx` (NEW)

```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  sourceMessageId?: Id<"messages">;
  sourceConversationId?: Id<"conversations">;
  sourceSelectionText?: string;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  initialContent,
  sourceMessageId,
  sourceConversationId,
  sourceSelectionText,
}: CreateNoteDialogProps) {
  const router = useRouter();
  const createNote = useMutation(api.notes.createNote);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Note content cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const noteId = await createNote({
        content,
        title: title || undefined, // Use auto-generated if empty
        sourceMessageId,
        sourceConversationId,
        sourceSelectionText,
      });

      toast.success("Note saved");
      onOpenChange(false);

      // Navigate to notes page with this note selected
      router.push(`/notes?id=${noteId}`);
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save as Note</DialogTitle>
          <DialogDescription>
            Create a new note from this content. You can edit it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave empty to auto-generate from first line"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {sourceMessageId && (
            <p className="text-xs text-muted-foreground">
              Source: Message in conversation
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Refactor MessageActions Component

**File**: `src/components/chat/MessageActions.tsx`

Add imports:
```typescript
import { FileText } from "lucide-react"; // For Save as Note icon
import { MessageActionsMenu } from "./MessageActionsMenu";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
```

Add state for CreateNoteDialog:
```typescript
// After other useState declarations
const [showCreateNote, setShowCreateNote] = useState(false);
```

Replace the return statement (lines 71-201) with:

```typescript
return (
  <>
    <div
      className={cn("flex items-center gap-2", "transition-all duration-200")}
    >
      {/* Copy Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Copy message (C)"}</p>
        </TooltipContent>
      </Tooltip>

      {!readOnly && (
        <>
          {/* Conditional: Retry or Stop or (nothing if generating and no stop) */}
          {shouldShowRetry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                  onClick={async () => {
                    try {
                      await retryMessage({ messageId: message._id });
                    } catch (error) {
                      console.error("Failed to retry:", error);
                    }
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="sr-only">Retry</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Retry message</p>
              </TooltipContent>
            </Tooltip>
          )}

          {isGenerating && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                  onClick={async () => {
                    try {
                      await stop({ messageId: message._id });
                    } catch (error) {
                      console.error("Failed to stop:", error);
                    }
                  }}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="sr-only">Stop</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Stop generation</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Bookmark Button */}
          <BookmarkButton message={message} />

          {/* NEW: Save as Note Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                onClick={() => setShowCreateNote(true)}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="sr-only">Save as Note</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save as note (N)</p>
            </TooltipContent>
          </Tooltip>

          {/* Overflow Menu */}
          <MessageActionsMenu
            message={message}
            isGenerating={isGenerating}
            isUser={isUser}
          />
        </>
      )}
    </div>

    {/* CreateNoteDialog */}
    <CreateNoteDialog
      open={showCreateNote}
      onOpenChange={setShowCreateNote}
      initialContent={message.content || message.partialContent || ""}
      sourceMessageId={message._id}
      sourceConversationId={message.conversationId}
    />
  </>
);
```

### 5. Add Keyboard Shortcut for Save as Note

**File**: `src/components/chat/ChatMessage.tsx`

Update keyboard handler (around line 94-185) to add 'N' key:

```typescript
const handleKeyDown = useCallback(
  (e: KeyboardEvent) => {
    if (!hasFocus) return;

    // Existing shortcuts...
    // R for regenerate
    // B for bookmark
    // C for copy
    // Delete/Backspace for delete

    // NEW: N for Save as Note
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      // Dispatch custom event to trigger save as note
      const event = new CustomEvent("save-message-as-note", {
        detail: { messageId: message._id },
      });
      window.dispatchEvent(event);
      return;
    }
  },
  [hasFocus, message._id, /* other deps */]
);
```

Then in `MessageActions.tsx`, listen for this event:

```typescript
// In MessageActions component, add useEffect
useEffect(() => {
  const handleSaveAsNote = (e: CustomEvent) => {
    if (e.detail.messageId === message._id) {
      setShowCreateNote(true);
    }
  };

  window.addEventListener("save-message-as-note", handleSaveAsNote as EventListener);
  return () => {
    window.removeEventListener("save-message-as-note", handleSaveAsNote as EventListener);
  };
}, [message._id]);
```

### 6. Mobile Responsive Behavior

**File**: `src/components/chat/MessageActions.tsx`

Add mobile detection at top of component:

```typescript
import { useMobileDetect } from "@/hooks/useMobileDetect";

// In component
const { isMobile } = useMobileDetect();
```

Conditionally render based on mobile:

```typescript
{!readOnly && (
  <>
    {isMobile ? (
      // On mobile: Show only overflow menu with ALL actions
      <MessageActionsMenuMobile
        message={message}
        isGenerating={isGenerating}
        isUser={isUser}
        onCopy={handleCopy}
        onSaveNote={() => setShowCreateNote(true)}
      />
    ) : (
      // Desktop: Show visible buttons + overflow menu
      <>
        {/* Retry/Stop */}
        {/* Bookmark */}
        {/* Save as Note */}
        <MessageActionsMenu ... />
      </>
    )}
  </>
)}
```

Create mobile-specific menu component:

**File**: `src/components/chat/MessageActionsMenuMobile.tsx` (NEW)

```typescript
// Similar to MessageActionsMenu but includes Copy, Bookmark, Save as Note
// in the dropdown menu instead of separate buttons
```

---

## Testing Checklist

- [ ] MessageActionsMenu component renders
- [ ] Overflow menu (⋯) opens on click
- [ ] Regenerate action works (assistant messages only)
- [ ] Branch action works
- [ ] Delete action works
- [ ] "Save as Note" button visible on all messages
- [ ] CreateNoteDialog opens on click
- [ ] Can save note with custom title
- [ ] Can save note without title (auto-generates)
- [ ] Redirects to `/notes` after save
- [ ] Toast notifications show on success/error
- [ ] Keyboard shortcut 'N' triggers save as note
- [ ] Mobile: All actions in single menu
- [ ] Desktop: Visible buttons + overflow menu

---

## Files Created/Modified

### Created
- `src/components/chat/MessageActionsMenu.tsx`
- `src/components/notes/CreateNoteDialog.tsx`
- `src/components/chat/MessageActionsMenuMobile.tsx` (optional)

### Modified
- `src/components/chat/MessageActions.tsx` (refactor to visible + menu pattern)
- `src/components/chat/ChatMessage.tsx` (add 'N' keyboard shortcut)

---

## Dependencies

**shadcn Components**:
- `dropdown-menu` (install via `bunx shadcn@latest add dropdown-menu`)

**Convex APIs Used**:
- `api.notes.createNote` (from Phase 1)
- `api.chat.regenerate` (existing)
- `api.chat.branchFromMessage` (existing)
- `api.chat.deleteMessage` (existing)

---

## Next Steps

After Phase 2:
- **Phase 3**: Implement summarize popover (selection menu → save as note)
- **Phase 4**: Build full Tiptap editor with toolbar
