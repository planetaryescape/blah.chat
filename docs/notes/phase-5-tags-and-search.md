# Phase 5: Tags & Search

## Overview

Implement hybrid tagging system (AI suggestions + manual tags) and enhanced search with filters.

**Dependencies**: Phase 1 (notes schema, search query), Phase 4 (editor)

**Estimated Time**: 1 day

---

## Goals

1. Create AI tag extraction action (using gpt-4o-mini)
2. Build tag UI component (suggested + accepted badges)
3. Implement tag accept/reject/remove functionality
4. Add search input with live filtering
5. Add filter controls (pinned, tags)
6. Enhance search to include tag filtering

---

## Implementation Steps

### 1. Create Tag Extraction Action

**File**: `convex/notes/tags.ts` (NEW)

```typescript
import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

/**
 * Extract suggested tags from note content using AI
 */
export const extractTags = action({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, { noteId }) => {
    // Get note content
    const note = await ctx.runQuery(internal.notes.getInternal, { noteId });
    if (!note) throw new Error("Note not found");

    // Skip if content is too short
    if (note.content.length < 50) {
      return { suggestedTags: [] };
    }

    try {
      // Use gpt-4o-mini for cost optimization
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
          {
            role: "system",
            content: `Extract 3-5 relevant, concise tags from the following note.
Tags should be:
- Single words or short phrases (max 2 words)
- Lowercase
- Relevant to the content
- Useful for categorization

Return ONLY the tags as a comma-separated list, nothing else.
Example: "typescript, web development, tutorial, react, hooks"`,
          },
          {
            role: "user",
            content: note.content,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
      });

      // Parse tags from response
      const tags = result.text
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length < 30)
        .slice(0, 5); // Limit to 5 tags

      // Update note with suggested tags
      await ctx.runMutation(internal.notes.updateSuggestedTags, {
        noteId,
        suggestedTags: tags,
      });

      return { suggestedTags: tags };
    } catch (error) {
      console.error("Failed to extract tags:", error);
      return { suggestedTags: [] };
    }
  },
});
```

**File**: `convex/notes.ts`

Add internal query and mutation:

```typescript
import { internalQuery, internalMutation } from "./_generated/server";

// Internal query to get note (for actions)
export const getInternal = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    return await ctx.db.get(noteId);
  },
});

// Internal mutation to update suggested tags
export const updateSuggestedTags = internalMutation({
  args: {
    noteId: v.id("notes"),
    suggestedTags: v.array(v.string()),
  },
  handler: async (ctx, { noteId, suggestedTags }) => {
    await ctx.db.patch(noteId, {
      suggestedTags,
      updatedAt: Date.now(),
    });
  },
});

// Update createNote to schedule tag extraction
export const createNote = mutation({
  // ... existing code ...
  handler: async (ctx, args) => {
    // ... existing code ...

    const noteId = await ctx.db.insert("notes", { /* ... */ });

    // Schedule tag extraction in background
    await ctx.scheduler.runAfter(
      0,
      internal.notes.tags.extractTags,
      { noteId }
    );

    return noteId;
  },
});

// Update updateNote to re-extract tags if content changed
export const updateNote = mutation({
  // ... existing code ...
  handler: async (ctx, { noteId, ...updates }) => {
    // ... existing validation ...

    await ctx.db.patch(noteId, patch);

    // Re-extract tags if content changed
    if (updates.content && updates.content.length >= 50) {
      await ctx.scheduler.runAfter(
        0,
        internal.notes.tags.extractTags,
        { noteId }
      );
    }
  },
});
```

### 2. Add Tag Mutations

**File**: `convex/notes.ts`

```typescript
/**
 * Accept a suggested tag (move to tags array)
 */
export const acceptTag = mutation({
  args: {
    noteId: v.id("notes"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, tag }) => {
    const note = await verifyOwnership(ctx, noteId);

    const currentTags = note.tags || [];
    const suggestedTags = note.suggestedTags || [];

    // Add to tags if not already there
    if (!currentTags.includes(tag)) {
      await ctx.db.patch(noteId, {
        tags: [...currentTags, tag],
        suggestedTags: suggestedTags.filter((t) => t !== tag),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Add a manual tag
 */
export const addTag = mutation({
  args: {
    noteId: v.id("notes"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, tag }) => {
    const note = await verifyOwnership(ctx, noteId);

    const currentTags = note.tags || [];
    const cleanTag = tag.trim().toLowerCase();

    if (!cleanTag || cleanTag.length > 30) {
      throw new Error("Invalid tag");
    }

    if (!currentTags.includes(cleanTag)) {
      await ctx.db.patch(noteId, {
        tags: [...currentTags, cleanTag],
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Remove a tag
 */
export const removeTag = mutation({
  args: {
    noteId: v.id("notes"),
    tag: v.string(),
  },
  handler: async (ctx, { noteId, tag }) => {
    const note = await verifyOwnership(ctx, noteId);

    const currentTags = note.tags || [];

    await ctx.db.patch(noteId, {
      tags: currentTags.filter((t) => t !== tag),
      updatedAt: Date.now(),
    });
  },
});
```

### 3. Create TagInput Component

**File**: `src/components/notes/TagInput.tsx` (NEW)

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TagInputProps {
  noteId: Id<"notes">;
  tags: string[];
  suggestedTags: string[];
}

export function TagInput({ noteId, tags, suggestedTags }: TagInputProps) {
  const [newTag, setNewTag] = useState("");
  const acceptTag = useMutation(api.notes.acceptTag);
  const addTag = useMutation(api.notes.addTag);
  const removeTag = useMutation(api.notes.removeTag);

  const handleAcceptTag = async (tag: string) => {
    try {
      await acceptTag({ noteId, tag });
    } catch (error) {
      console.error("Failed to accept tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    try {
      await addTag({ noteId, tag: newTag.trim() });
      setNewTag("");
    } catch (error) {
      console.error("Failed to add tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      await removeTag({ noteId, tag });
    } catch (error) {
      console.error("Failed to remove tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-3">
      {/* Active Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="cursor-pointer hover:bg-primary/80"
              onClick={() => handleRemoveTag(tag)}
            >
              {tag}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Suggested Tags */}
      {suggestedTags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Suggested tags:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleAcceptTag(tag)}
              >
                <Plus className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Tag Input */}
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag..."
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={handleAddTag}
          disabled={!newTag.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
```

### 4. Add Badge Component

```bash
bunx shadcn@latest add badge
```

### 5. Update NoteEditor with TagInput

**File**: `src/components/notes/NoteEditor.tsx`

Import:
```typescript
import { TagInput } from "./TagInput";
```

Add sidebar section below editor content:

```typescript
return (
  <div className="flex h-full">
    {/* Main Editor Column */}
    <div className="flex-1 flex flex-col">
      {/* Header, Toolbar, Editor (existing) */}
    </div>

    {/* Right Sidebar: Tags & Metadata */}
    <aside className="w-64 border-l bg-muted/10 p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Tags</h3>
        <TagInput
          noteId={note._id}
          tags={note.tags || []}
          suggestedTags={note.suggestedTags || []}
        />
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>
          <span className="font-medium">Created:</span>{" "}
          {new Date(note.createdAt).toLocaleDateString()}
        </div>
        <div>
          <span className="font-medium">Updated:</span>{" "}
          {new Date(note.updatedAt).toLocaleDateString()}
        </div>
        {note.sourceMessageId && (
          <div className="mt-2">
            <span className="font-medium">Source:</span> Message
          </div>
        )}
      </div>
    </aside>
  </div>
);
```

### 6. Create Search & Filter UI

**File**: `src/components/notes/NoteSearch.tsx` (NEW)

```typescript
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";

interface NoteSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function NoteSearch({ value, onChange, onClear }: NoteSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search notes..."
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
```

**File**: `src/components/notes/NoteFilters.tsx` (NEW)

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Pin } from "lucide-react";

interface NoteFiltersProps {
  filterPinned: boolean;
  onTogglePinned: () => void;
}

export function NoteFilters({ filterPinned, onTogglePinned }: NoteFiltersProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={filterPinned ? "default" : "outline"}
        size="sm"
        onClick={onTogglePinned}
      >
        <Pin className="h-3 w-3 mr-1" />
        Pinned
      </Button>
    </div>
  );
}
```

### 7. Update Notes Page with Search

**File**: `src/app/(main)/notes/page.tsx`

```typescript
import { NoteSearch } from "@/components/notes/NoteSearch";
import { NoteFilters } from "@/components/notes/NoteFilters";

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState(false);

  // Use search query instead of list query
  const notes = useQuery(
    api.notes.searchNotes,
    { searchQuery, filterPinned }
  );

  // ... rest of component ...

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r bg-muted/10">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Notes</h1>
            <Button size="sm">New Note</Button>
          </div>

          {/* Search */}
          <NoteSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
          />

          {/* Filters */}
          <NoteFilters
            filterPinned={filterPinned}
            onTogglePinned={() => setFilterPinned(!filterPinned)}
          />

          {/* Count */}
          <p className="text-sm text-muted-foreground">
            {notes?.length || 0} {notes?.length === 1 ? 'note' : 'notes'}
          </p>
        </div>

        {/* Note List */}
        {/* ... existing list code ... */}
      </aside>

      {/* ... main content ... */}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] AI extracts tags when note created (background)
- [ ] AI re-extracts tags when content updated
- [ ] Suggested tags appear in editor sidebar
- [ ] Click suggested tag → moves to active tags
- [ ] Can add manual tag via input
- [ ] Enter key adds tag
- [ ] Click active tag → removes it
- [ ] Tags persist across page refresh
- [ ] Search input filters notes by content
- [ ] Search is case-insensitive
- [ ] Pinned filter shows only pinned notes
- [ ] Pinned + search work together
- [ ] Tag extraction handles short content gracefully
- [ ] Tag extraction handles errors gracefully
- [ ] Max 5 suggested tags per note

---

## Files Created/Modified

### Created
- `convex/notes/tags.ts`
- `src/components/notes/TagInput.tsx`
- `src/components/notes/NoteSearch.tsx`
- `src/components/notes/NoteFilters.tsx`

### Modified
- `convex/notes.ts` (add tag mutations, schedule extraction)
- `src/components/notes/NoteEditor.tsx` (add sidebar with TagInput)
- `src/app/(main)/notes/page.tsx` (add search & filters)

---

## AI Tag Extraction Details

**Model**: `gpt-4o-mini` (cost-optimized, fast)

**Prompt Strategy**:
- System prompt defines tag format and constraints
- Low temperature (0.3) for consistency
- Parse comma-separated response
- Validate & clean tags (lowercase, length limits)

**Triggers**:
- On note creation (if content > 50 chars)
- On content update (if content > 50 chars)
- Background job (async, non-blocking)

**Edge Cases**:
- Short content: Skip extraction
- Extraction fails: Log error, continue (no tags suggested)
- Invalid tags: Filter out during parsing

---

## Search Implementation

**Current** (Phase 1):
- `searchNotes` query with full-text search
- Filters by pinned status

**Enhancements**:
- Search includes note content (already implemented)
- Filter by pinned (already implemented)
- Future: Filter by tags (add to query)

---

## Next Steps

After Phase 5:
- **Phase 6**: Implement sharing functionality
- **Phase 7**: Final polish (mobile, keyboard shortcuts, virtual scrolling)
