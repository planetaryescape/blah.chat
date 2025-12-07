# Phase 7: Polish & Optimization

## Overview

Final improvements: mobile responsiveness, keyboard shortcuts, virtual scrolling, empty states, and UX polish.

**Dependencies**: All previous phases (complete feature set)

**Estimated Time**: 1 day

---

## Goals

1. Mobile-responsive layouts for all note components
2. Add global keyboard shortcuts (Cmd+K for search, Cmd+N for new note)
3. Implement virtual scrolling for large note lists
4. Create empty states for all scenarios
5. Add loading skeletons
6. Polish animations and transitions
7. Add "New Note" functionality

---

## Implementation Steps

### 1. Mobile Responsive Layouts

**File**: `src/app/(main)/notes/page.tsx`

Update layout to stack on mobile:

```typescript
export default function NotesPage() {
  const { isMobile } = useMobileDetect();
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(null);

  // On mobile: show list OR editor, not both
  const showList = isMobile ? !selectedNoteId : true;
  const showEditor = isMobile ? !!selectedNoteId : true;

  return (
    <div className="flex h-screen">
      {/* Sidebar - hidden on mobile when note selected */}
      {showList && (
        <aside className={cn(
          "border-r bg-muted/10",
          isMobile ? "w-full" : "w-80"
        )}>
          {/* ... sidebar content ... */}
        </aside>
      )}

      {/* Main - full width on mobile */}
      {showEditor && (
        <main className={cn(
          isMobile && selectedNoteId ? "w-full" : "flex-1"
        )}>
          {/* Back button on mobile */}
          {isMobile && selectedNoteId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedNoteId(null)}
              className="m-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
          )}

          {selectedNoteId ? (
            <NoteEditor noteId={selectedNoteId} />
          ) : (
            <EmptyState onCreateNote={handleCreateNote} />
          )}
        </main>
      )}
    </div>
  );
}
```

**File**: `src/components/notes/NoteEditor.tsx`

Hide sidebar on mobile, make toolbar scrollable:

```typescript
const { isMobile } = useMobileDetect();

return (
  <div className="flex h-full">
    {/* Main Editor */}
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4">
        {/* ... existing header content ... */}
      </div>

      {/* Toolbar - horizontal scroll on mobile */}
      <div className={cn(
        isMobile && "overflow-x-auto"
      )}>
        <NoteToolbar editor={editor} />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>

    {/* Sidebar - hidden on mobile */}
    {!isMobile && (
      <aside className="w-64 border-l bg-muted/10 p-4">
        {/* ... tags & metadata ... */}
      </aside>
    )}
  </div>
);
```

### 2. Global Keyboard Shortcuts

**File**: `src/components/notes/KeyboardShortcuts.tsx` (NEW)

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcutsProps {
  onNewNote?: () => void;
  onSearch?: () => void;
}

export function KeyboardShortcuts({ onNewNote, onSearch }: KeyboardShortcutsProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+N: New note
      if (isMod && e.key === "n") {
        e.preventDefault();
        onNewNote?.();
      }

      // Cmd/Ctrl+K: Focus search
      if (isMod && e.key === "k") {
        e.preventDefault();
        onSearch?.();
      }

      // Cmd/Ctrl+/: Show shortcuts help (future feature)
      if (isMod && e.key === "/") {
        e.preventDefault();
        // Show shortcuts modal
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewNote, onSearch]);

  return null;
}
```

**File**: `src/app/(main)/notes/page.tsx`

Add keyboard shortcuts:

```typescript
import { KeyboardShortcuts } from "@/components/notes/KeyboardShortcuts";

export default function NotesPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleNewNote = async () => {
    const noteId = await createNote({
      content: "",
      title: "Untitled Note",
    });
    setSelectedNoteId(noteId);
  };

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
  };

  return (
    <>
      <KeyboardShortcuts
        onNewNote={handleNewNote}
        onSearch={handleFocusSearch}
      />

      {/* ... rest of page ... */}
    </>
  );
}
```

### 3. Virtual Scrolling for Large Lists

**Install dependency**:
```bash
bun add @tanstack/react-virtual
```

**File**: `src/components/notes/NoteList.tsx` (NEW)

```typescript
"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { Doc } from "@/convex/_generated/dataModel";
import { NoteListItem } from "./NoteListItem";
import { useRef } from "react";

interface NoteListProps {
  notes: Doc<"notes">[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NoteList({ notes, selectedId, onSelect }: NoteListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height of each note item
    overscan: 5, // Render 5 extra items above/below viewport
  });

  if (notes.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No notes found.</p>
        <p className="text-sm mt-2">Create your first note to get started.</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto h-[calc(100vh-200px)]"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const note = notes[virtualItem.index];

          return (
            <div
              key={note._id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <NoteListItem
                note={note}
                isSelected={selectedId === note._id}
                onClick={() => onSelect(note._id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4. Empty States

**File**: `src/components/notes/EmptyState.tsx` (NEW)

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { FileText, Sparkles } from "lucide-react";

interface EmptyStateProps {
  variant?: "no-notes" | "no-selection" | "no-results";
  onCreateNote?: () => void;
}

export function EmptyState({ variant = "no-selection", onCreateNote }: EmptyStateProps) {
  if (variant === "no-notes") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first note to get started. You can save message summaries or write from scratch.
          </p>
          {onCreateNote && (
            <Button onClick={onCreateNote}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Note
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "no-results") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-muted-foreground">No notes match your search.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try a different query or create a new note.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p className="text-lg">Select a note to view</p>
        <p className="text-sm mt-2">or create a new one</p>
      </div>
    </div>
  );
}
```

### 5. Loading Skeletons

**File**: `src/components/notes/NoteListSkeleton.tsx` (NEW)

```typescript
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function NoteListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
```

**File**: `src/components/notes/NoteEditorSkeleton.tsx` (NEW)

```typescript
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function NoteEditorSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

Update pages to use skeletons:

```typescript
// In NotesPage
if (!notes) {
  return <NoteListSkeleton />;
}

// In NoteEditor
if (!note || !editor) {
  return <NoteEditorSkeleton />;
}
```

### 6. Animations & Transitions

**File**: `src/components/notes/NoteListItem.tsx`

Add Framer Motion animations:

```typescript
import { motion } from "framer-motion";

export function NoteListItem({ note, isSelected, onClick }: NoteListItemProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={/* ... */}
    >
      {/* ... content ... */}
    </motion.button>
  );
}
```

### 7. New Note Functionality

**File**: `src/app/(main)/notes/page.tsx`

Add "New Note" button handler:

```typescript
const createNote = useMutation(api.notes.createNote);

const handleCreateNote = async () => {
  try {
    const noteId = await createNote({
      content: "# New Note\n\nStart writing...",
      title: "New Note",
    });

    setSelectedNoteId(noteId);
    toast.success("Note created");
  } catch (error) {
    console.error("Failed to create note:", error);
    toast.error("Failed to create note");
  }
};

// In header:
<Button size="sm" onClick={handleCreateNote}>
  <Plus className="h-4 w-4 mr-1" />
  New Note
</Button>
```

### 8. Additional Polish

**Sorting Options**:

```typescript
// In NotesPage
const [sortBy, setSortBy] = useState<"updated" | "created" | "title">("updated");

// Sort notes client-side
const sortedNotes = useMemo(() => {
  if (!notes) return [];

  return [...notes].sort((a, b) => {
    if (sortBy === "updated") return b.updatedAt - a.updatedAt;
    if (sortBy === "created") return b.createdAt - a.createdAt;
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return 0;
  });
}, [notes, sortBy]);
```

**Pinned Notes First**:

```typescript
const sortedNotes = useMemo(() => {
  if (!notes) return [];

  const pinned = notes.filter(n => n.isPinned);
  const unpinned = notes.filter(n => !n.isPinned);

  return [...pinned, ...unpinned];
}, [notes]);
```

**Confirmation Dialog for Delete**:

```typescript
// Add to NoteEditor
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDelete = async () => {
  try {
    await deleteNote({ noteId: note._id });
    router.push("/notes");
    toast.success("Note deleted");
  } catch (error) {
    toast.error("Failed to delete note");
  }
};

// In header
<DropdownMenuItem
  onClick={() => setShowDeleteConfirm(true)}
  className="text-destructive"
>
  <Trash2 className="mr-2 h-4 w-4" />
  Delete Note
</DropdownMenuItem>

<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this note?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Testing Checklist

### Mobile
- [ ] Sidebar shows full width on mobile
- [ ] Selecting note hides sidebar
- [ ] Back button appears on mobile when viewing note
- [ ] Back button returns to list
- [ ] Toolbar scrolls horizontally on mobile
- [ ] Editor tags hidden on mobile
- [ ] Touch interactions work smoothly

### Keyboard Shortcuts
- [ ] Cmd+N creates new note
- [ ] Cmd+K focuses search
- [ ] Cmd+S saves note (in editor)
- [ ] Shortcuts ignored when typing in inputs

### Virtual Scrolling
- [ ] List scrolls smoothly with 100+ notes
- [ ] Only visible items rendered
- [ ] Scroll position maintained when selecting note
- [ ] No performance lag with large datasets

### Empty States
- [ ] Shows "no notes" when list empty
- [ ] Shows "no selection" when no note selected
- [ ] Shows "no results" when search returns nothing
- [ ] Create button works from empty state

### Loading States
- [ ] Skeletons show while loading
- [ ] Smooth transition from skeleton to content
- [ ] Loading doesn't block interaction

### Animations
- [ ] Note items fade in on mount
- [ ] Smooth transitions between states
- [ ] No janky animations

### Polish
- [ ] Pinned notes appear first
- [ ] Sort options work correctly
- [ ] Delete confirmation prevents accidents
- [ ] Toast notifications for all actions

---

## Files Created/Modified

### Created
- `src/components/notes/KeyboardShortcuts.tsx`
- `src/components/notes/NoteList.tsx` (virtual scrolling version)
- `src/components/notes/EmptyState.tsx`
- `src/components/notes/NoteListSkeleton.tsx`
- `src/components/notes/NoteEditorSkeleton.tsx`

### Modified
- `src/app/(main)/notes/page.tsx` (mobile, shortcuts, new note)
- `src/components/notes/NoteEditor.tsx` (mobile, delete confirmation)
- `src/components/notes/NoteListItem.tsx` (animations)

---

## Performance Optimizations

**Virtual Scrolling**:
- Only renders visible items + overscan
- Handles 1000+ notes smoothly
- Estimated row height: 80px
- Overscan: 5 items

**Memoization**:
```typescript
const sortedNotes = useMemo(() => { /* ... */ }, [notes, sortBy]);
const filteredNotes = useMemo(() => { /* ... */ }, [notes, searchQuery]);
```

**Debounced Search**:
```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => setSearchQuery(query), 300),
  []
);
```

---

## Accessibility

- [ ] Keyboard navigation works throughout
- [ ] Screen reader labels on all interactive elements
- [ ] Focus indicators visible
- [ ] ARIA labels on icon buttons
- [ ] Semantic HTML structure

---

## Final Checklist

- [ ] All 7 phases complete
- [ ] All tests passing
- [ ] Mobile responsive
- [ ] Keyboard shortcuts work
- [ ] Performance optimized
- [ ] Empty states polished
- [ ] Loading states smooth
- [ ] Animations feel natural
- [ ] Security review complete (DOMPurify)
- [ ] Accessibility verified

---

## Next Steps

**After Phase 7**, the Notes system is production-ready. Consider future enhancements:

- Export notes (markdown, PDF)
- Import notes from files
- Collaborative editing (real-time)
- Note templates
- Advanced search (date ranges, tag combinations)
- Keyboard shortcuts help modal
- Dark mode optimizations
- Note versioning/history
