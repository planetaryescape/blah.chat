"use client";

import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, Plus } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/notes/EmptyState";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteFilters } from "@/components/notes/NoteFilters";
import { NoteList } from "@/components/notes/NoteList";
import { NoteListSkeleton } from "@/components/notes/NoteListSkeleton";
import { NoteSearch } from "@/components/notes/NoteSearch";
import { TagManagement } from "@/components/notes/TagManagement";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";
import { useMobileDetect } from "@/hooks/useMobileDetect";

function NotesPageContent() {
  // URL-persisted state
  const [filterPinned, setFilterPinned] = useQueryState(
    "pinned",
    parseAsBoolean.withDefault(false),
  );

  const [selectedTags, setSelectedTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const [tagFilterMode, setTagFilterMode] = useQueryState(
    "mode",
    parseAsStringEnum(["AND", "OR"]).withDefault("AND"),
  );

  // Search with debouncing
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const searchQuery = useDebounce(searchParam, 300);

  // Note ID with type casting for Convex
  const [noteIdParam, setNoteIdParam] = useQueryState(
    "note",
    parseAsString.withDefault(""),
  );

  const selectedNoteId = useMemo(() => {
    return noteIdParam ? (noteIdParam as Id<"notes">) : null;
  }, [noteIdParam]);

  const setSelectedNoteId = useCallback(
    (id: Id<"notes"> | null) => {
      setNoteIdParam(id || "");
    },
    [setNoteIdParam],
  );

  // Local state (not shareable)
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const { isMobile } = useMobileDetect();

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const notes = useQuery(api.notes.searchNotes, {
    searchQuery, // Debounced searchParam
    filterPinned: filterPinned || undefined,
    filterTags: selectedTags.length > 0 ? selectedTags : undefined,
    tagFilterMode,
  });

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createNote = useMutation(api.notes.createNote);

  // Validate selected note exists
  const selectedNote = useMemo(() => {
    if (!selectedNoteId || !notes) return null;
    return notes.find((n: { _id: string }) => n._id === selectedNoteId);
  }, [selectedNoteId, notes]);

  // Clear invalid selection from URL
  useEffect(() => {
    if (selectedNoteId && notes && !selectedNote) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId, notes, selectedNote, setSelectedNoteId]);

  // Create new note handler
  const createNewNote = async () => {
    try {
      const noteId = await createNote({
        content: "# New Note\n\nStart writing...",
        title: "New Note",
      });
      setSelectedNoteId(noteId);
      if (isMobile) setMobileView("editor");
      toast.success("Note created");
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error("Failed to create note");
    }
  };

  // Keyboard shortcuts event listeners
  useEffect(() => {
    const handleNewNote = () => createNewNote();
    const handleClearSelection = () => {
      setSelectedNoteId(null); // Clears from URL
      if (isMobile) setMobileView("list");
    };

    window.addEventListener("create-new-note", handleNewNote);
    window.addEventListener("clear-note-selection", handleClearSelection);

    return () => {
      window.removeEventListener("create-new-note", handleNewNote);
      window.removeEventListener("clear-note-selection", handleClearSelection);
    };
  }, [isMobile, setSelectedNoteId, createNewNote]);

  // Handle note selection
  const handleNoteSelect = (noteId: Id<"notes">) => {
    setSelectedNoteId(noteId);
    if (isMobile) setMobileView("editor");
  };

  // Handle back to list on mobile
  const handleBackToList = () => {
    if (isMobile) {
      setMobileView("list");
    }
  };

  // Handle mobile view rendering with stable layout
  if (isMobile) {
    if (mobileView === "list") {
      return (
        <div className="flex flex-col h-[100dvh]">
          <aside className="flex-1 flex flex-col bg-muted/10">
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Notes</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={createNewNote}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <NoteSearch
                value={searchParam}
                onChange={setSearchParam}
                onClear={() => setSearchParam("")}
              />

              <NoteFilters
                filterPinned={filterPinned}
                onTogglePinned={() => setFilterPinned(!filterPinned)}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                tagFilterMode={tagFilterMode}
                onTagFilterModeChange={setTagFilterMode}
              />

              <p className="text-sm text-muted-foreground">
                {notes ? (
                  `${notes.length} ${notes.length === 1 ? "note" : "notes"}`
                ) : (
                  <Skeleton className="h-4 w-16" />
                )}
              </p>
            </div>

            {notes === undefined ? (
              <NoteListSkeleton />
            ) : notes.length === 0 ? (
              searchParam || filterPinned || selectedTags.length > 0 ? (
                <EmptyState variant="no-results" />
              ) : (
                <EmptyState variant="no-notes" onCreateNote={createNewNote} />
              )
            ) : (
              <NoteList
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelect={handleNoteSelect}
              />
            )}
          </aside>
        </div>
      );
    } else {
      // Mobile editor view
      return (
        <div className="flex flex-col h-[100dvh]">
          <div className="border-b p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Notes
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {selectedNote?._id ? (
              <NoteEditor noteId={selectedNote._id} />
            ) : (
              <EmptyState variant="no-selection" onCreateNote={createNewNote} />
            )}
          </div>
        </div>
      );
    }
  }

  // Desktop: Two-column layout with stable structure
  return (
    <div className="flex h-screen">
      {/* Left Sidebar: Note List */}
      <aside className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Notes</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={createNewNote}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Note</span>
            </Button>
          </div>

          <NoteSearch
            value={searchParam}
            onChange={setSearchParam}
            onClear={() => setSearchParam("")}
          />

          <NoteFilters
            filterPinned={filterPinned}
            onTogglePinned={() => setFilterPinned(!filterPinned)}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            tagFilterMode={tagFilterMode}
            onTagFilterModeChange={setTagFilterMode}
          />

          <TagManagement />

          <p className="text-sm text-muted-foreground">
            {notes ? (
              `${notes.length} ${notes.length === 1 ? "note" : "notes"}`
            ) : (
              <Skeleton className="h-4 w-20 inline-block" />
            )}
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          {notes === undefined ? (
            <NoteListSkeleton />
          ) : notes.length === 0 ? (
            searchParam || filterPinned || selectedTags.length > 0 ? (
              <EmptyState variant="no-results" />
            ) : (
              <EmptyState variant="no-notes" onCreateNote={createNewNote} />
            )
          ) : (
            <NoteList
              notes={notes}
              selectedNoteId={selectedNoteId}
              onSelect={setSelectedNoteId}
            />
          )}
        </div>
      </aside>

      {/* Main Content: Editor or Empty State */}
      <main className="flex-1">
        {selectedNote?._id ? (
          <NoteEditor noteId={selectedNote._id} />
        ) : (
          <EmptyState variant="no-selection" onCreateNote={createNewNote} />
        )}
      </main>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<NoteListSkeleton />}>
      <NotesPageContent />
    </Suspense>
  );
}
