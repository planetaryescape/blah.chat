# Phase 4: Rich Text Editor

## Overview

Build full-featured Tiptap editor with formatting toolbar, auto-save, and proper markdown/HTML handling.

**Dependencies**: Phase 1 (notes CRUD, Tiptap extensions already created)

**Estimated Time**: 1-2 days

---

## Goals

1. Create `NoteToolbar` component with formatting controls
2. Build `NoteEditor` component with Tiptap integration
3. Implement auto-save with debounce (2s)
4. Add save status indicator ("Saving..." → "Saved")
5. Wire up markdown ↔ HTML conversion
6. Update notes page to use full editor
7. Add keyboard shortcuts (Cmd+S for manual save, Cmd+K for command palette future)

---

## Implementation Steps

### 1. Create NoteToolbar Component

**File**: `src/components/notes/NoteToolbar.tsx` (NEW)

```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo,
  Undo,
} from "lucide-react";

interface NoteToolbarProps {
  editor: Editor | null;
}

export function NoteToolbar({ editor }: NoteToolbarProps) {
  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive,
    icon: Icon,
    label,
  }: {
    onClick: () => void;
    isActive: boolean;
    icon: any;
    label: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={`h-8 w-8 p-0 ${isActive ? 'bg-muted' : ''}`}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="border-b bg-muted/10 p-2 flex flex-wrap items-center gap-1">
      {/* Text Formatting */}
      <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={Bold}
          label="Bold (Cmd+B)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={Italic}
          label="Italic (Cmd+I)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          icon={Code}
          label="Inline Code (Cmd+E)"
        />
      </div>

      {/* Headings */}
      <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          icon={Heading1}
          label="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={Heading2}
          label="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          icon={Heading3}
          label="Heading 3"
        />
      </div>

      {/* Lists */}
      <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={List}
          label="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={ListOrdered}
          label="Numbered List"
        />
      </div>

      {/* Insert */}
      <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          isActive={editor.isActive('link')}
          icon={LinkIcon}
          label="Add Link"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          icon={Code2}
          label="Code Block"
        />
      </div>

      {/* History */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          icon={Undo}
          label="Undo (Cmd+Z)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          icon={Redo}
          label="Redo (Cmd+Shift+Z)"
        />
      </div>
    </div>
  );
}
```

### 2. Create NoteEditor Component

**File**: `src/components/notes/NoteEditor.tsx` (NEW)

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createExtensions } from "@/lib/tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pin, PinOff, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NoteToolbar } from "./NoteToolbar";

interface NoteEditorProps {
  noteId: Id<"notes">;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useQuery(api.notes.getNote, { noteId });
  const updateNote = useMutation(api.notes.updateNote);
  const togglePin = useMutation(api.notes.togglePin);

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: createExtensions("Start writing..."),
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      // Trigger auto-save on content change
      debouncedSave(editor.getHTML(), editor.storage.markdown.getMarkdown());
    },
  });

  // Load note content when it changes
  useEffect(() => {
    if (note && editor) {
      setTitle(note.title);
      editor.commands.setContent(note.content); // markdown
    }
  }, [note, editor]);

  // Debounced auto-save (2 seconds after typing stops)
  const debouncedSave = (html: string, markdown: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave(markdown);
    }, 2000);
  };

  const handleAutoSave = async (markdown: string) => {
    if (!note) return;

    setIsSaving(true);
    try {
      await updateNote({
        noteId: note._id,
        title,
        content: markdown,
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save (Cmd+S)
  const handleManualSave = async () => {
    if (!editor || !note) return;

    const markdown = editor.storage.markdown.getMarkdown();
    await handleAutoSave(markdown);
    toast.success("Note saved");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S / Ctrl+S for manual save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, note]);

  const handleTogglePin = async () => {
    if (!note) return;

    try {
      await togglePin({ noteId: note._id });
      toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update pin status");
    }
  };

  if (!note || !editor) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            debouncedSave(editor.getHTML(), editor.storage.markdown.getMarkdown());
          }}
          placeholder="Note title..."
          className="flex-1 text-xl font-semibold border-0 focus-visible:ring-0 px-0"
        />

        <div className="flex items-center gap-2">
          {/* Save Status */}
          <div className="text-sm text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            ) : lastSaved ? (
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            ) : null}
          </div>

          {/* Pin Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePin}
          >
            {note.isPinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>

          {/* Share Button (Phase 6) */}
          <Button variant="ghost" size="sm" disabled>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <NoteToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

### 3. Update Notes Page to Use Full Editor

**File**: `src/app/(main)/notes/page.tsx`

Replace `NoteEditorPlaceholder` with:

```typescript
import { NoteEditor } from "@/components/notes/NoteEditor";

// In NotesPage component, replace:
{selectedNoteId ? (
  <NoteEditor noteId={selectedNoteId} />
) : (
  <EmptyState />
)}
```

### 4. Update Tiptap Utils for Markdown Storage

**File**: `src/lib/tiptap/utils.ts`

Update to use Tiptap's markdown extension:

```typescript
import DOMPurify from 'dompurify';

// Tiptap handles markdown <-> HTML automatically via extension
// We just need sanitization for display

/**
 * Sanitize HTML content before rendering
 * Used for public share pages and HTML cache display
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'code', 'pre',
      'ul', 'ol', 'li',
      'a', 'blockquote',
    ],
    ALLOWED_ATTR: ['href', 'class'],
  });
}

/**
 * Extract title from markdown content
 */
export function extractTitle(markdown: string): string {
  const lines = markdown.split('\n').filter(line => line.trim());
  if (!lines.length) return 'Untitled Note';

  const firstLine = lines[0];
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled Note';
}

/**
 * Generate excerpt for preview (first 150 chars)
 */
export function generateExcerpt(markdown: string, maxLength = 150): string {
  const plainText = markdown
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();

  return plainText.length > maxLength
    ? plainText.slice(0, maxLength) + '...'
    : plainText;
}
```

### 5. Update Convex Mutations

**File**: `convex/notes.ts`

Tiptap stores markdown in `editor.storage.markdown.getMarkdown()`, so we store markdown as source of truth and HTML as cache:

```typescript
// In updateNote mutation
if (updates.content) {
  // content is markdown from Tiptap
  patch.htmlContent = markdownToHtml(updates.content);
}

// Implement markdownToHtml using marked + DOMPurify
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function markdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown);
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'code', 'pre',
      'ul', 'ol', 'li',
      'a', 'blockquote',
    ],
    ALLOWED_ATTR: ['href', 'class'],
  });
}
```

### 6. Add NoteListItem Component (Enhanced)

**File**: `src/components/notes/NoteListItem.tsx` (NEW)

```typescript
"use client";

import { generateExcerpt } from "@/lib/tiptap/utils";
import type { Doc } from "@/convex/_generated/dataModel";
import { Pin } from "lucide-react";

interface NoteListItemProps {
  note: Doc<"notes">;
  isSelected: boolean;
  onClick: () => void;
}

export function NoteListItem({ note, isSelected, onClick }: NoteListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors ${
        isSelected ? 'bg-muted' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium truncate flex-1">{note.title}</div>
        {note.isPinned && (
          <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
        {generateExcerpt(note.content)}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="text-xs text-muted-foreground">
          {new Date(note.updatedAt).toLocaleDateString()}
        </div>

        {note.tags && note.tags.length > 0 && (
          <div className="flex gap-1">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-muted px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
```

Update notes page to use it:
```typescript
import { NoteListItem } from "@/components/notes/NoteListItem";

// In NoteList rendering:
{notes.map((note) => (
  <NoteListItem
    key={note._id}
    note={note}
    isSelected={selectedNoteId === note._id}
    onClick={() => setSelectedNoteId(note._id)}
  />
))}
```

---

## Testing Checklist

- [ ] Toolbar renders with all buttons
- [ ] Bold (Cmd+B) works
- [ ] Italic (Cmd+I) works
- [ ] Inline code (Cmd+E) works
- [ ] Headings (H1, H2, H3) work
- [ ] Bullet/numbered lists work
- [ ] Add link prompts for URL and creates link
- [ ] Code block toggle works
- [ ] Undo/Redo work
- [ ] Auto-save triggers 2s after typing stops
- [ ] "Saving..." indicator shows during save
- [ ] "Saved [time]" shows after successful save
- [ ] Cmd+S triggers manual save
- [ ] Title auto-updates on edit
- [ ] Pin button toggles pinned status
- [ ] Markdown stored in database
- [ ] HTML cache regenerated on save
- [ ] Editor loads existing note content correctly
- [ ] Switching between notes loads correct content

---

## Files Created/Modified

### Created
- `src/components/notes/NoteToolbar.tsx`
- `src/components/notes/NoteEditor.tsx`
- `src/components/notes/NoteListItem.tsx`

### Modified
- `src/app/(main)/notes/page.tsx` (use NoteEditor instead of placeholder)
- `src/lib/tiptap/utils.ts` (add sanitization, excerpt generation)
- `convex/notes.ts` (ensure markdown→HTML conversion on save)

---

## Tiptap Configuration

**Extensions used** (from Phase 1 `lib/tiptap/extensions.ts`):
- `StarterKit` (headings, paragraphs, bold, italic, lists, code blocks)
- `Markdown` (automatic markdown storage)
- `Link` (clickable links)
- `Placeholder` (empty state text)

**Storage format**:
- **Markdown** = source of truth (editable, portable)
- **HTML** = cached for fast display (regenerated on save)

**Auto-save strategy**:
- Debounce 2s after last keystroke
- Save both title and content
- Regenerate HTML cache server-side
- Show save status to user

---

## Next Steps

After Phase 4:
- **Phase 5**: Add AI tag extraction and hybrid search
- **Phase 6**: Implement sharing functionality
- **Phase 7**: Final polish (mobile, empty states, keyboard shortcuts)
