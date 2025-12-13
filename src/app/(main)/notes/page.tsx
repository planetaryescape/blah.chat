"use client";

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { EmptyState } from "@/components/notes/EmptyState";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteListSkeleton } from "@/components/notes/NoteListSkeleton";
import { NoteSidebar } from "@/components/notes/NoteSidebar";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft } from "lucide-react";
import {
    parseAsArrayOf,
    parseAsBoolean,
    parseAsString,
    parseAsStringEnum,
    useQueryState,
} from "nuqs";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function NotesPageContent() {
  const features = useFeatureToggles();

  // Route guard: show disabled page if notes feature is off
  if (!features.showNotes) {
    return <DisabledFeaturePage featureName="Notes" settingKey="showNotes" />;
  }

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

  // Project filter (URL-persisted)
  const [projectIdParam, setProjectIdParam] = useQueryState(
    "project",
    parseAsString.withDefault(""),
  );
  const projectId = useMemo(
    () => (projectIdParam ? (projectIdParam as Id<"projects">) : null),
    [projectIdParam],
  );
  const setProjectId = useCallback(
    (id: Id<"projects"> | null) => setProjectIdParam(id || ""),
    [setProjectIdParam],
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

  // Local state
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [showFilters, setShowFilters] = useState(false);

  const { isMobile } = useMobileDetect();

  // @ts-ignore - Type depth exceeded with complex Convex query
  const notes = useQuery(api.notes.searchNotes, {
    searchQuery,
    filterPinned: filterPinned || undefined,
    filterTags: selectedTags.length > 0 ? selectedTags : undefined,
    tagFilterMode,
    projectId: projectId || undefined,
  });

  // @ts-ignore - Type depth exceeded with complex Convex mutation
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

  // Shared Sidebar Props
  const sidebarProps = {
    notes,
    selectedNoteId,
    onSelectNote: handleNoteSelect,
    onCreateNote: createNewNote,
    searchParam: searchParam || "",
    onSearchChange: setSearchParam,
    filterPinned: filterPinned || false,
    onTogglePinned: () => setFilterPinned(!filterPinned),
    selectedTags: selectedTags || [],
    onTagsChange: setSelectedTags,
    tagFilterMode: tagFilterMode || "AND",
    onTagFilterModeChange: setTagFilterMode,
    projectId,
    onProjectIdChange: setProjectId,
    showFilters,
    onToggleFilters: () => setShowFilters(!showFilters),
  };

  // Mobile View
  if (isMobile) {
    if (mobileView === "list") {
      return (
        <div className="flex flex-col h-[100dvh]">
          <NoteSidebar {...sidebarProps} className="flex-1 w-full border-r-0" />
        </div>
      );
    } else {
      return (
        <div className="flex flex-col h-[100dvh] bg-background">
          <div className="border-b p-2 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
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

  // Desktop View
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Fixed width for now, could be resizable */}
      <div className="w-80 shrink-0 h-full">
        <NoteSidebar {...sidebarProps} />
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full min-w-0 bg-background/50">
        {selectedNote?._id ? (
          <NoteEditor noteId={selectedNote._id} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <EmptyState variant="no-selection" onCreateNote={createNewNote} />
          </div>
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
