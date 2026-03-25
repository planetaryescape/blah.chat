"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { useCreateNote } from "@/lib/hooks/mutations/useNoteMutations";

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  sourceMessageId?: string;
  sourceConversationId?: string;
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
  const createNoteMutation = useCreateNote();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  // Sync content when dialog opens with new initialContent
  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setTitle("");
    }
  }, [open, initialContent]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Note content cannot be empty");
      return;
    }

    setIsSaving(true);

    try {
      const note = await createNoteMutation.mutateAsync({
        content,
        title: title.trim() || undefined,
        sourceMessageId,
        sourceConversationId,
      });

      toast.success("Note saved");
      onOpenChange(false);

      router.push(`/notes?note=${note._id}`);
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
            Create a new note. You can edit it in the notes page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            </div>
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
