"use client";

import { NoteEditorSkeleton } from "@/components/notes/NoteEditorSkeleton";
import { NoteShareDialog } from "@/components/notes/NoteShareDialog";
import { NoteToolbar } from "@/components/notes/NoteToolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MinimalTagInput } from "@/components/ui/minimal-tag-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { createExtensions } from "@/lib/tiptap/extensions";
import { cn } from "@/lib/utils";
import { EditorContent, useEditor } from "@tiptap/react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Clock,
  FolderOpen,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

interface NoteEditorProps {
  noteId: Id<"notes">;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  // @ts-ignore - Type depth exceeded
  const note = useQuery(api.notes.getNote, { noteId });
  // @ts-ignore - Type depth exceeded
  const projects = useQuery(api.projects.list);
  const updateNote = useMutation(api.notes.updateNote);
  const togglePin = useMutation(api.notes.togglePin);
  const deleteNote = useMutation(api.notes.deleteNote);

  const { isMobile } = useMobileDetect();

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  // Initialize editor with SSR-safe config
  const editor = useEditor({
    immediatelyRender: false,
    extensions: createExtensions("Start writing..."),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm md:prose-lg dark:prose-invert focus:outline-none max-w-3xl mx-auto px-8 py-8 min-h-[50vh]",
      },
    },
    onUpdate: ({ editor }) => {
      // Skip auto-save on initial load
      if (isInitialLoad.current) return;

      const markdown = editor.getMarkdown();
      debouncedSave(markdown, title);
    },
  });

  // Load note content when note changes
  useEffect(() => {
    if (!note || !editor) return;

    // Check if we switched notes or if this is the first load of the content
    // We check note._id against a stored ID in editor storage to properly detect switches
    const storage = editor.storage as any;
    const isNewNote = note._id !== storage.currentNoteId;

    if (isNewNote || isInitialLoad.current) {
      storage.currentNoteId = note._id;
      isInitialLoad.current = true;
      setTitle(note.title);

      // Set editor content from markdown
      editor.commands.setContent(note.content || "", {
        contentType: "markdown",
      });

      // Reset initial load flag after a small delay
      setTimeout(() => {
        if (!editor.isDestroyed) {
          isInitialLoad.current = false;
        }
      }, 50);
    } else if (note.title !== title && !isSaving) {
      // Sync title if changed externally and we are not currently saving
      setTitle(note.title);
    }
  }, [note, editor, noteId]); // Correct dependencies: re-run when note data loads

  // Debounced auto-save
  const debouncedSave = (content: string, currentTitle: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await performSave(content, currentTitle);
    }, 2000);
  };

  // Perform the actual save
  const performSave = useCallback(
    async (content: string, currentTitle: string) => {
      setIsSaving(true);
      try {
        await updateNote({
          noteId,
          content,
          title: currentTitle || undefined, // Let server extract from content if empty
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error("Failed to save note:", error);
        toast.error("Failed to save note");
      } finally {
        setIsSaving(false);
      }
    },
    [noteId, updateNote],
  );

  // Manual save (Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();

        // Cancel debounced save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Save immediately
        if (editor) {
          const markdown = editor.getMarkdown();
          performSave(markdown, title);
          toast.success("Note saved");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, title, performSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    // Debounce title save
    if (editor && !isInitialLoad.current) {
      const markdown = editor.getMarkdown();
      debouncedSave(markdown, newTitle);
    }
  };

  if (!note) {
    return <NoteEditorSkeleton />;
  }

  return (
    <motion.div
      key={noteId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full bg-background"
    >
      {/* Header Bar - Minimized */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {lastSaved ? (
            <span className="flex items-center gap-1.5 opacity-70">
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {isSaving
                ? "Saving..."
                : `Saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          ) : (
            <span className="opacity-0">Ready</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={async () => {
              await updateNote({
                noteId,
                isPinned: !note.isPinned,
              });
            }}
          >
            <Pin
              className={cn(
                "h-4 w-4",
                note.isPinned && "fill-current text-orange-500",
              )}
            />
          </Button>

          <NoteShareDialog noteId={noteId} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog
            open={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  note.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteNote({ noteId });
                    setIsDeleteConfirmOpen(false);
                    toast.success("Note deleted");
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Editor Wrapper with max-width for readability */}
        <div className="max-w-3xl mx-auto w-full">
          {/* Title Area */}
          <div className="px-8 pt-10 pb-4">
            <TextareaAutosize
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title"
              className="w-full resize-none text-4xl font-bold bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/20 leading-tight"
              maxRows={2}
            />

            {/* Meta Information Row */}
            <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-muted-foreground">
              {/* Project Selector */}
              <div className="flex items-center gap-2 hover:text-foreground transition-colors">
                <FolderOpen className="h-4 w-4" />
                <Select
                  value={note.projectId || "none"}
                  onValueChange={async (value: string) => {
                    await updateNote({
                      noteId,
                      projectId:
                        value === "none"
                          ? undefined
                          : (value as Id<"projects">),
                    });
                    toast.success(
                      value === "none"
                        ? "Removed from project"
                        : "Moved to project",
                    );
                  }}
                >
                  <SelectTrigger className="h-auto p-0 border-none bg-transparent shadow-none w-auto gap-1 text-sm font-medium hover:underline focus:ring-0">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source Link */}
              {note.sourceConversationId && (
                <Link
                  href={`/chat/${note.sourceConversationId}${note.sourceMessageId ? `?messageId=${note.sourceMessageId}#message-${note.sourceMessageId}` : ""}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Linked Chat</span>
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}

              {/* Metadata Separator */}
              <div className="h-4 w-px bg-border/50" />

              {/* Tag Input */}
              <div className="flex-1 min-w-[200px]">
                <MinimalTagInput
                  noteId={noteId}
                  tags={note.tags || []}
                  suggestedTags={note.suggestedTags || []}
                />
              </div>
            </div>
          </div>

          {/* Note Content Editor */}
          <div className="relative">
            {/* Floating Toolbar when selecting text - handled by Tiptap extensions usually, but here fixed toolbar is asked */}
            <div className="sticky top-0 z-10 px-8 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 mb-4 transition-all">
              <NoteToolbar editor={editor} />
            </div>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
