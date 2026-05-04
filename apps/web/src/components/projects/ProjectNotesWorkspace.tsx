"use client";

import { formatDistanceToNow } from "date-fns";
import { Plus, Save, Star, Trash2 } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { type ProjectNote, useProjectNotes } from "@/hooks/useProjectNotes";
import { cn } from "@/lib/utils";

function buildExcerpt(content: string) {
  return content
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function ProjectNotesWorkspace({ projectId }: { projectId: string }) {
  const { isMobile } = useMobileDetect();
  const [noteParam, setNoteParam] = useQueryState("note");
  const { notes, isLoading, createNote, updateNote, deleteNote, isUpdating } =
    useProjectNotes(projectId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const selectedNoteId = noteParam;
  const selectedNote = useMemo(
    () => notes.find((note) => note._id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  useEffect(() => {
    if (selectedNoteId && !selectedNote && notes.length > 0) {
      void setNoteParam(null);
    }
  }, [notes.length, selectedNote, selectedNoteId, setNoteParam]);

  useEffect(() => {
    if (!selectedNote) {
      setTitle("");
      setContent("");
      setTags("");
      setIsPinned(false);
      return;
    }

    setTitle(selectedNote.title);
    setContent(selectedNote.content);
    setTags((selectedNote.tags ?? []).join(", "));
    setIsPinned(selectedNote.isPinned);
  }, [selectedNote]);

  const isDirty =
    selectedNote !== null &&
    (title !== selectedNote.title ||
      content !== selectedNote.content ||
      tags !== (selectedNote.tags ?? []).join(", ") ||
      isPinned !== selectedNote.isPinned);

  async function persistNote(note: ProjectNote, silent = false) {
    await updateNote({
      noteId: note._id,
      title,
      content,
      tags: tags.split(",").flatMap((tag) => {
        const trimmed = tag.trim();
        return trimmed ? [trimmed] : [];
      }),
      isPinned,
    });

    if (!silent) {
      toast.success("Note saved");
    }
  }

  async function handleSelectNote(nextId: string | null) {
    if (selectedNote && isDirty) {
      await persistNote(selectedNote, true);
    }
    await setNoteParam(nextId);
  }

  async function handleCreateNote() {
    const note = await createNote({
      title: "Untitled Note",
      content: "# New Note\n\n",
    });
    await setNoteParam(note._id);
    toast.success("Note created");
  }

  async function handleDeleteNote() {
    if (!selectedNote) {
      return;
    }

    await deleteNote(selectedNote._id);
    await setNoteParam(null);
    toast.success("Note deleted");
  }

  return (
    <div className="flex h-full bg-background">
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
            onClick={() => void handleCreateNote()}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-muted-foreground">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No notes in this project.
              <Button
                variant="link"
                onClick={() => void handleCreateNote()}
                className="px-1 text-primary"
              >
                Create one
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-border/40">
                {notes.map((note) => (
                  <button
                    key={note._id}
                    type="button"
                    onClick={() => void handleSelectNote(note._id)}
                    className={cn(
                      "w-full text-left px-4 py-3.5 transition-colors hover:bg-muted/30",
                      selectedNoteId === note._id && "bg-secondary",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">
                            {note.title}
                          </h3>
                          {note.isPinned && (
                            <Star className="h-3 w-3 text-amber-500 fill-current shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {buildExcerpt(note.content) || "No additional text"}
                        </p>
                        {(note.tags ?? []).length > 0 && (
                          <p className="text-[10px] text-muted-foreground/70 mt-2 truncate">
                            {(note.tags ?? [])
                              .map((tag) => `#${tag}`)
                              .join(" ")}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        {formatDistanceToNow(note.updatedAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 bg-background",
          !selectedNoteId && isMobile ? "hidden" : "flex",
        )}
      >
        {selectedNote ? (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b bg-background/70 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {formatDistanceToNow(selectedNote.updatedAt, {
                  addSuffix: true,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant={isPinned ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIsPinned((value) => !value)}
                >
                  <Star className={cn("h-4 w-4", isPinned && "fill-current")} />
                </Button>
                <Button
                  size="sm"
                  onClick={() => void persistNote(selectedNote)}
                  disabled={!isDirty || isUpdating}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete note?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the project note from the Postgres store.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleDeleteNote()}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-6 space-y-4">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  if (selectedNote && isDirty) {
                    void persistNote(selectedNote, true);
                  }
                }}
                className="text-xl font-semibold border-0 shadow-none px-0 focus-visible:ring-0"
                placeholder="Untitled Note"
              />
              <Input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                onBlur={() => {
                  if (selectedNote && isDirty) {
                    void persistNote(selectedNote, true);
                  }
                }}
                placeholder="Tags, comma separated"
              />
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onBlur={() => {
                  if (selectedNote && isDirty) {
                    void persistNote(selectedNote, true);
                  }
                }}
                placeholder="Start writing..."
                className="min-h-[60vh] resize-none"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Select a note to view</p>
              <Button
                onClick={() => void handleCreateNote()}
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
