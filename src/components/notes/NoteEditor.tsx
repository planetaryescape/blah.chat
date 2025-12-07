"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteToolbar } from "@/components/notes/NoteToolbar";
import { TagInput } from "@/components/notes/TagInput";
import { NoteEditorSkeleton } from "@/components/notes/NoteEditorSkeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createExtensions } from "@/lib/tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pin, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { cn } from "@/lib/utils";

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
          "prose prose-sm md:prose-lg focus:outline-none max-w-none p-8 min-h-[calc(100dvh-14rem)] md:min-h-[calc(100vh-12rem)]",
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
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className={cn(
        "flex gap-4 p-4 border-b border-border",
        isMobile ? "flex-col items-stretch" : "items-center"
      )}>
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
          className="flex-1 text-lg font-semibold border-none shadow-none focus-visible:ring-0"
        />

        {/* Tags */}
        <div className={cn(isMobile ? "w-full" : "flex-shrink-0 w-64")}>
          <TagInput
            noteId={noteId}
            tags={note.tags || []}
            suggestedTags={note.suggestedTags || []}
          />
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

        {/* Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTogglePin}
          className={note.isPinned ? "text-primary" : ""}
        >
          <Pin className={`h-4 w-4 ${note.isPinned ? "fill-current" : ""}`} />
        </Button>

        <Button variant="ghost" size="sm" disabled>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Toolbar */}
      <NoteToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </motion.div>
  );
}
