"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  sourceMessageId?: Id<"messages">;
  sourceConversationId?: Id<"conversations">;
  sourceSelectionText?: string;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  initialContent,
  sourceMessageId,
  sourceConversationId,
  sourceSelectionText,
}: CreateNoteDialogProps) {
  const router = useRouter();
  // @ts-ignore - Convex type instantiation depth issue
  const createNote = useMutation(api.notes.createNote);
  // @ts-ignore - Convex type instantiation depth issue
  const generateTitle = useAction(api.notes.generateTitle.generateTitle);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  // Sync content when dialog opens with new initialContent
  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setTitle(""); // Reset title when dialog opens
    }
  }, [open, initialContent]);

  const handleGenerateTitle = async () => {
    if (!content.trim()) {
      toast.error("Add some content first");
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const result = await generateTitle({ content });
      setTitle(result.title);
      toast.success("Title generated!");
    } catch (error) {
      console.error("Failed to generate title:", error);
      toast.error("Failed to generate title");
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Note content cannot be empty");
      return;
    }

    setIsSaving(true);
    let finalTitle = title;

    try {
      // If no title provided, generate one with AI
      if (!finalTitle.trim()) {
        toast.info("Generating title with AI...");
        try {
          const result = await generateTitle({ content });
          finalTitle = result.title;
        } catch (error) {
          console.error("Failed to generate title:", error);
          // Fall back to manual extraction if AI fails
          finalTitle = ""; // Will use server-side extractTitle
        }
      }

      const noteId = await createNote({
        content,
        title: finalTitle || undefined, // Use AI-generated or fall back to server extraction
        sourceMessageId,
        sourceConversationId,
        sourceSelectionText,
      });

      toast.success("Note saved");
      onOpenChange(false);

      // Navigate to notes page with this note selected
      router.push(`/notes?id=${noteId}`);
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save as Note</DialogTitle>
          <DialogDescription>
            Create a new note from this content. You can edit it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave empty to auto-generate from first line"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateTitle}
                disabled={isGeneratingTitle || !content.trim()}
                className="shrink-0"
              >
                {isGeneratingTitle ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {sourceMessageId && (
            <p className="text-xs text-muted-foreground">
              Source: Message in conversation
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
