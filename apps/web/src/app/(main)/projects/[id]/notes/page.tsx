"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useQueryState } from "nuqs";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteList } from "@/components/notes/NoteList";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { cn } from "@/lib/utils";

export default function ProjectNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;

  // URL-persisted note selection (supports deep linking from search results)
  const [noteParam, setNoteParam] = useQueryState("note");
  const [searchQuery, _setSearchQuery] = useState("");

  // Derive selectedNoteId from URL param
  const selectedNoteId = noteParam as Id<"notes"> | null;
  const setSelectedNoteId = (id: Id<"notes"> | null) => {
    setNoteParam(id);
  };

  // Queries
  // @ts-ignore - Type depth exceeded
  const notes = useQuery(api.notes.searchNotes, {
    searchQuery,
    projectId,
  });

  // @ts-ignore - Type depth exceeded
  const createNote = useMutation(api.notes.createNote);

  const { isMobile } = useMobileDetect();

  // Validate selected note exists in this project's notes
  const selectedNote = useMemo(() => {
    if (!selectedNoteId || !notes) return null;
    return notes.find((n: { _id: string }) => n._id === selectedNoteId);
  }, [selectedNoteId, notes]);

  // Clear invalid selection from URL (note doesn't exist or not in this project)
  useEffect(() => {
    if (selectedNoteId && notes && !selectedNote) {
      setNoteParam(null);
    }
  }, [selectedNoteId, notes, selectedNote, setNoteParam]);

  const handleCreateNote = async () => {
    try {
      const noteId = await createNote({
        content: "# New Note\n\n",
        projectId,
      });
      setSelectedNoteId(noteId);
      toast.success("Note created in project");
    } catch (_e) {
      toast.error("Failed to create note");
    }
  };

  if (notes === undefined) {
    return <div className="p-8 text-muted-foreground">Loading notes...</div>;
  }

  // Split View Layout
  return (
    <div className="flex h-full bg-background">
      {/* List Pane (Left) */}
      <div
        className={cn(
          "flex flex-col border-r w-80 min-w-[300px] bg-muted/5 transition-all",
          selectedNoteId && isMobile ? "hidden" : "flex",
        )}
      >
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-muted/5 backdrop-blur z-10">
          <h2 className="font-semibold text-sm">Notes</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCreateNote}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search could go here if needed */}

        <div className="flex-1 overflow-hidden">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No notes in this project.
              <Button
                variant="link"
                onClick={handleCreateNote}
                className="px-1 text-primary"
              >
                Create one
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <NoteList
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelect={setSelectedNoteId}
              />
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Editor Pane (Right) */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 bg-background",
          !selectedNoteId && isMobile ? "hidden" : "flex",
        )}
      >
        {selectedNoteId ? (
          <NoteEditor
            noteId={selectedNoteId}
            // In a real implementation we might pass a back handler for mobile
            // or modify NoteEditor to be context aware.
            // For now assuming desktop-first split pane.
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Select a note to view</p>
              <Button
                onClick={handleCreateNote}
                variant="outline"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
