"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
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
import { useDebounceValue } from "usehooks-ts";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { EmptyState } from "@/components/notes/EmptyState";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteListSkeleton } from "@/components/notes/NoteListSkeleton";
import { NoteSidebar } from "@/components/notes/NoteSidebar";
import { Button } from "@/components/ui/button";
import { useNoteCacheSync } from "@/hooks/useCacheSync";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMobileDetect } from "@/hooks/useMobileDetect";

// Delay to allow Convex → Dexie cache sync after note creation
const CACHE_SYNC_DELAY_MS = 200;

function NotesPageContent() {
  const { showNotes, isLoading: prefsLoading } = useFeatureToggles();

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
  const [searchQuery] = useDebounceValue(searchParam, 300);

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

  // Local-first: fetch all notes, filter client-side
  const { notes: allNotes } = useNoteCacheSync();

  // Client-side filtering
  const notes = useMemo(() => {
    let filtered = allNotes;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.content?.toLowerCase().includes(query),
      );
    }

    // Pinned filter
    if (filterPinned) {
      filtered = filtered.filter((n) => n.isPinned);
    }

    // Project filter
    if (projectId) {
      filtered = filtered.filter((n) => n.projectId === projectId);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((n) => {
        const noteTags = n.tags || [];
        if (tagFilterMode === "AND") {
          return selectedTags.every((tag) => noteTags.includes(tag));
        }
        return selectedTags.some((tag) => noteTags.includes(tag));
      });
    }

    // Sort by updatedAt descending
    return [...filtered].sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    );
  }, [
    allNotes,
    searchQuery,
    filterPinned,
    projectId,
    selectedTags,
    tagFilterMode,
  ]);

  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const createNote = useMutation(api.notes.createNote);

  // Validate selected note exists
  const selectedNote = useMemo(() => {
    if (!selectedNoteId || !notes) return null;
    return notes.find((n: { _id: string }) => n._id === selectedNoteId);
  }, [selectedNoteId, notes]);

  // Clear invalid selection from URL (debounced to allow cache sync)
  useEffect(() => {
    if (selectedNoteId && notes && !selectedNote) {
      const timeout = setTimeout(() => {
        setSelectedNoteId(null);
      }, CACHE_SYNC_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [selectedNoteId, notes, selectedNote, setSelectedNoteId]);

  // Create new note handler
  const createNewNote = useCallback(async () => {
    try {
      const noteId = await createNote({
        content: "",
        title: "",
        projectId: projectId || undefined,
      });
      setSelectedNoteId(noteId);
      if (isMobile) setMobileView("editor");
      toast.success("Note created");
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error("Failed to create note");
    }
  }, [createNote, projectId, setSelectedNoteId, isMobile]);

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

  // Show loading while preferences are being fetched
  if (prefsLoading) {
    return <FeatureLoadingScreen />;
  }

  // Route guard: show disabled page if notes feature is off
  if (!showNotes) {
    return <DisabledFeaturePage featureName="Notes" settingKey="showNotes" />;
  }

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
