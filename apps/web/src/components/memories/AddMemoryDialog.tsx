"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/useAsyncAction";

interface AddMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (content: string) => Promise<void>;
}

/**
 * Dialog for manually adding a new memory.
 */
export function AddMemoryDialog({
  open,
  onOpenChange,
  onAdd,
}: AddMemoryDialogProps) {
  const [content, setContent] = useState("");
  const { run: handleAdd, isPending: isAdding } = useAsyncAction(async () => {
    if (!content.trim()) return;
    await onAdd(content);
    setContent("");
    onOpenChange(false);
  });

  const handleClose = () => {
    onOpenChange(false);
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Memory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Memory</DialogTitle>
          <DialogDescription>
            Manually add a fact for the AI to remember.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="e.g. I prefer Python over JavaScript..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding || !content.trim()}>
            {isAdding ? "Adding..." : "Add Memory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
