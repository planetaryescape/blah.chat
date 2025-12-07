# Phase 1: Schema & CRUD Operations

## Overview

Establish foundational Notes system: database schema, Convex mutations/queries, basic Tiptap editor, and minimal notes page.

**Dependencies**: None (foundation phase)

**Estimated Time**: 1 day

---

## Goals

1. Add `notes` table to Convex schema
2. Implement all CRUD mutations and queries
3. Set up Tiptap editor with basic configuration
4. Create minimal `/notes` page with list view
5. Implement markdown ↔ HTML conversion with sanitization

---

## Schema Changes

### File: `convex/schema.ts`

Add after the `snippets` table definition:

```typescript
notes: defineTable({
  userId: v.id("users"),
  title: v.string(), // auto-generated from first line or user-editable
  content: v.string(), // markdown (source of truth)
  htmlContent: v.optional(v.string()), // cached HTML for display

  // Source tracking (optional - message/conversation this came from)
  sourceMessageId: v.optional(v.id("messages")),
  sourceConversationId: v.optional(v.id("conversations")),
  sourceSelectionText: v.optional(v.string()), // original text if from summary

  // Metadata
  tags: v.optional(v.array(v.string())),
  suggestedTags: v.optional(v.array(v.string())), // AI-generated suggestions
  isPinned: v.boolean(),

  // Sharing
  shareId: v.optional(v.string()), // unique ID for public share URL
  isPublic: v.optional(v.boolean()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"]) // for recent notes sorting
  .index("by_source_message", ["sourceMessageId"]) // optional cleanup
  .index("by_share_id", ["shareId"]) // for public access
  .searchIndex("search_notes", {
    searchField: "content",
    filterFields: ["userId"],
  })
```

---

## Dependencies Installation

```bash
# Tiptap core + extensions
bun add @tiptap/core@2.9.1 \
        @tiptap/react@2.9.1 \
        @tiptap/starter-kit@2.9.1 \
        @tiptap/extension-markdown@2.9.1 \
        @tiptap/extension-placeholder@2.9.1 \
        @tiptap/extension-link@2.9.1

# HTML sanitization (XSS protection)
bun add dompurify
bun add -D @types/dompurify
```

---

## Implementation Steps

### 1. Create Tiptap Utilities

**File**: `src/lib/tiptap/extensions.ts` (NEW)

```typescript
import StarterKit from '@tiptap/starter-kit'
import Markdown from '@tiptap/extension-markdown'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

export const createExtensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: {
      HTMLAttributes: {
        class: 'rounded-lg bg-muted p-4 font-mono text-sm',
      },
    },
    bulletList: {
      HTMLAttributes: {
        class: 'list-disc list-inside space-y-1',
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: 'list-decimal list-inside space-y-1',
      },
    },
  }),
  Markdown.configure({
    html: false, // Security: don't allow raw HTML in markdown
    transformPastedText: true,
    transformCopiedText: true,
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-blue-500 underline hover:text-blue-600',
    },
  }),
  Placeholder.configure({
    placeholder: placeholder || 'Start writing...',
  }),
]
```

**File**: `src/lib/tiptap/utils.ts` (NEW)

```typescript
import DOMPurify from 'dompurify';
import { marked } from 'marked'; // or use remark/rehype if preferred

/**
 * Convert markdown to sanitized HTML
 * Storage: markdown is source of truth, HTML is cached for fast display
 */
export function markdownToHtml(markdown: string): string {
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

/**
 * Extract title from content (first line or first heading)
 */
export function extractTitle(markdown: string): string {
  const lines = markdown.split('\n').filter(line => line.trim());
  if (!lines.length) return 'Untitled Note';

  const firstLine = lines[0];
  // Remove markdown heading syntax
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled Note';
}

/**
 * Generate excerpt for preview (first 150 chars)
 */
export function generateExcerpt(markdown: string, maxLength = 150): string {
  const plainText = markdown
    .replace(/^#+\s*/gm, '') // Remove headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/`(.+?)`/g, '$1') // Remove code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .trim();

  return plainText.length > maxLength
    ? plainText.slice(0, maxLength) + '...'
    : plainText;
}
```

**Install marked** (if using for markdown parsing):
```bash
bun add marked
bun add -D @types/marked
```

### 2. Create Convex Mutations & Queries

**File**: `convex/notes.ts` (NEW)

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nanoid } from "nanoid"; // for shareId generation

// Helper to get current user ID
async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new Error("User not found");
  return user._id;
}

// Helper to verify note ownership
async function verifyOwnership(ctx: any, noteId: string) {
  const userId = await getCurrentUserId(ctx);
  const note = await ctx.db.get(noteId);

  if (!note || note.userId !== userId) {
    throw new Error("Note not found or access denied");
  }

  return note;
}

// Placeholder for markdown → HTML conversion (implement in Phase 4)
function markdownToHtml(markdown: string): string {
  // TODO: Import from lib/tiptap/utils.ts
  return markdown; // For now, return as-is
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0];
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled Note';
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new note
 */
export const createNote = mutation({
  args: {
    content: v.string(),
    title: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("messages")),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceSelectionText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const title = args.title || extractTitle(args.content);
    const htmlContent = markdownToHtml(args.content);

    const noteId = await ctx.db.insert("notes", {
      userId,
      title,
      content: args.content,
      htmlContent,
      sourceMessageId: args.sourceMessageId,
      sourceConversationId: args.sourceConversationId,
      sourceSelectionText: args.sourceSelectionText,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return noteId;
  },
});

/**
 * Update an existing note
 */
export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { noteId, ...updates }) => {
    await verifyOwnership(ctx, noteId);

    const patch: any = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Regenerate HTML if content changed
    if (updates.content) {
      patch.htmlContent = markdownToHtml(updates.content);

      // Auto-update title from content if not explicitly provided
      if (!updates.title) {
        patch.title = extractTitle(updates.content);
      }
    }

    await ctx.db.patch(noteId, patch);
  },
});

/**
 * Delete a note
 */
export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    await verifyOwnership(ctx, noteId);
    await ctx.db.delete(noteId);
  },
});

/**
 * Toggle note pinned status
 */
export const togglePin = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    const note = await verifyOwnership(ctx, noteId);
    await ctx.db.patch(noteId, {
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single note by ID
 */
export const getNote = query({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note) return null;

    const userId = await getCurrentUserId(ctx);
    if (note.userId !== userId) {
      throw new Error("Access denied");
    }

    return note;
  },
});

/**
 * List all notes for current user (sorted by updated date)
 */
export const listNotes = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);

    return await ctx.db
      .query("notes")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100); // Limit to most recent 100
  },
});

/**
 * Search notes (full-text search + filters)
 */
export const searchNotes = query({
  args: {
    searchQuery: v.string(),
    filterPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { searchQuery, filterPinned }) => {
    const userId = await getCurrentUserId(ctx);

    let notes;

    if (!searchQuery || searchQuery.trim() === "") {
      // No search query: return recent notes
      notes = await ctx.db
        .query("notes")
        .withIndex("by_user_updated", (q) => q.eq("userId", userId))
        .order("desc")
        .take(100);
    } else {
      // Full-text search
      notes = await ctx.db
        .query("notes")
        .withSearchIndex("search_notes", (q) =>
          q.search("content", searchQuery).eq("userId", userId)
        )
        .take(50);
    }

    // Client-side filter for pinned status
    if (filterPinned) {
      notes = notes.filter((n) => n.isPinned);
    }

    return notes;
  },
});
```

**Install nanoid** (for share IDs in future phases):
```bash
bun add nanoid
```

### 3. Create Basic Notes Page

**File**: `src/app/(main)/notes/page.tsx` (NEW)

```typescript
"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(null);
  const notes = useQuery(api.notes.listNotes);

  if (!notes) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar: Note List */}
      <aside className="w-80 border-r bg-muted/10">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </p>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No notes yet.</p>
              <p className="text-sm mt-2">Create your first note to get started.</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notes.map((note) => (
                <button
                  key={note._id}
                  onClick={() => setSelectedNoteId(note._id)}
                  className={`w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                    selectedNoteId === note._id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="font-medium truncate">{note.title}</div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {note.content.slice(0, 100)}...
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content: Editor or Empty State */}
      <main className="flex-1">
        {selectedNoteId ? (
          <NoteEditorPlaceholder noteId={selectedNoteId} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

// Placeholder components (implement in Phase 4)
function NoteEditorPlaceholder({ noteId }: { noteId: Id<"notes"> }) {
  const note = useQuery(api.notes.getNote, { noteId });

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{note.title}</h1>
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap">{note.content}</pre>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <p className="text-lg">Select a note to view</p>
        <p className="text-sm mt-2">or create a new one</p>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Schema deployed to Convex (check dashboard)
- [ ] Create note mutation works
- [ ] Update note mutation works
- [ ] Delete note mutation works
- [ ] List notes query returns data
- [ ] Search notes query works (empty query)
- [ ] `/notes` page renders without errors
- [ ] Can see created notes in list
- [ ] Clicking note shows placeholder editor
- [ ] Title auto-extracts from first line

---

## Next Steps

After Phase 1 is complete:
- **Phase 2**: Add "Save as Note" button to message actions
- **Phase 3**: Implement summarize popover
- **Phase 4**: Build full Tiptap editor with toolbar
- **Phase 5**: Add AI tag extraction and search
- **Phase 6**: Implement sharing functionality

---

## Files Created/Modified

### Created
- `src/lib/tiptap/extensions.ts`
- `src/lib/tiptap/utils.ts`
- `convex/notes.ts`
- `src/app/(main)/notes/page.tsx`

### Modified
- `convex/schema.ts` (add notes table)

---

## Dependencies

**NPM Packages**:
- `@tiptap/core@2.9.1`
- `@tiptap/react@2.9.1`
- `@tiptap/starter-kit@2.9.1`
- `@tiptap/extension-markdown@2.9.1`
- `@tiptap/extension-placeholder@2.9.1`
- `@tiptap/extension-link@2.9.1`
- `dompurify`
- `@types/dompurify`
- `marked` (for markdown parsing)
- `@types/marked`
- `nanoid` (for share IDs)

**Convex Schema**: Must deploy schema changes before testing
