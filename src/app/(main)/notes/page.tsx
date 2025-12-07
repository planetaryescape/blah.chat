"use client";

import { EmptyState } from "@/components/notes/EmptyState";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteFilters } from "@/components/notes/NoteFilters";
import { NoteList } from "@/components/notes/NoteList";
import { NoteListSkeleton } from "@/components/notes/NoteListSkeleton";
import { NoteSearch } from "@/components/notes/NoteSearch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const { isMobile } = useMobileDetect();

  // @ts-ignore - Convex type instantiation depth issue
  const notes = useQuery(api.notes.searchNotes, {
    searchQuery,
    filterPinned: filterPinned || undefined,
  });

  // @ts-ignore - Convex type instantiation depth issue
  const createNote = useMutation(api.notes.createNote);

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
      setSelectedNoteId(null);
      if (isMobile) setMobileView("list");
    };

    window.addEventListener("create-new-note", handleNewNote);
    window.addEventListener("clear-note-selection", handleClearSelection);

    return () => {
      window.removeEventListener("create-new-note", handleNewNote);
      window.removeEventListener("clear-note-selection", handleClearSelection);
    };
  }, [isMobile]);

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
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery("")}
              />

              <NoteFilters
                filterPinned={filterPinned}
                onTogglePinned={() => setFilterPinned(!filterPinned)}
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
              searchQuery || filterPinned ? (
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
            {selectedNoteId ? (
              <NoteEditor noteId={selectedNoteId} />
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
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
          />

          <NoteFilters
            filterPinned={filterPinned}
            onTogglePinned={() => setFilterPinned(!filterPinned)}
          />

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
            searchQuery || filterPinned ? (
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
        {selectedNoteId ? (
          <NoteEditor noteId={selectedNoteId} />
        ) : (
          <EmptyState variant="no-selection" onCreateNote={createNewNote} />
        )}
      </main>
    </div>
  );
}
