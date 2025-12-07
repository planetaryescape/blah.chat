"use client";

import { NoteEditorSkeleton } from "@/components/notes/NoteEditorSkeleton";
import { NoteShareDialog } from "@/components/notes/NoteShareDialog";
import { NoteToolbar } from "@/components/notes/NoteToolbar";
import { Button } from "@/components/ui/button";
import { MinimalTagInput } from "@/components/ui/minimal-tag-input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { createExtensions } from "@/lib/tiptap/extensions";
import { cn } from "@/lib/utils";
import { EditorContent, useEditor } from "@tiptap/react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowUpRight, Loader2, MessageSquare, Pin } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

interface NoteEditorProps {
  noteId: Id<"notes">;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  // @ts-ignore - Convex type instantiation depth issue
  const note = useQuery(api.notes.getNote, { noteId });
  // @ts-ignore - Convex type instantiation depth issue
  const updateNote = useMutation(api.notes.updateNote);
  // @ts-ignore - Convex type instantiation depth issue
  const togglePin = useMutation(api.notes.togglePin);

  const { isMobile } = useMobileDetect();

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
          "prose prose-sm md:prose-lg focus:outline-none max-w-none px-8 py-4 min-h-[calc(100dvh-14rem)] md:min-h-[calc(100vh-12rem)]",
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

    isInitialLoad.current = true;
    setTitle(note.title);

    // Set editor content from markdown
    if (note.content) {
      editor.commands.setContent(note.content, {
        contentType: "markdown",
      });
    }

    // Reset initial load flag after a brief delay
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
  }, [note?.content, editor]);

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
  const performSave = async (content: string, currentTitle: string) => {
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
  };

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
  }, [editor, title, noteId]);

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

  // Handle pin toggle
  const handleTogglePin = async () => {
    try {
      await togglePin({ noteId });
      toast.success(note?.isPinned ? "Unpinned note" : "Pinned note");
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update pin status");
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
      {/* Seamless Header */}
      <div className="px-8 pt-8 pb-4 space-y-4">
        <TextareaAutosize
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title"
          className="w-full resize-none text-4xl font-bold bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/40"
          maxRows={2}
        />

        {/* Source Link (if from conversation) */}
        {note.sourceConversationId && (
          <Link
            href={`/chat/${note.sourceConversationId}${note.sourceMessageId ? `?messageId=${note.sourceMessageId}#message-${note.sourceMessageId}` : ""}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Created from conversation</span>
            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        )}

        {/* Minimalist Meta Bar */}
        <div className="flex items-center gap-4 border-b border-border/40 pb-4">
          {/* Tags */}
          <div className="flex-1">
            <MinimalTagInput
              noteId={noteId}
              tags={note.tags || []}
              suggestedTags={note.suggestedTags || []}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-4">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <span>
                  Saved{" "}
                  {lastSaved.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePin}
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted/50 transition-colors",
                note.isPinned ? "text-primary" : "text-muted-foreground",
              )}
              title={note.isPinned ? "Unpin note" : "Pin note"}
            >
              <Pin className={cn("h-4 w-4", note.isPinned && "fill-current")} />
            </Button>

            <NoteShareDialog noteId={noteId} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-2">
        <NoteToolbar editor={editor} />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </motion.div>
  );
}
