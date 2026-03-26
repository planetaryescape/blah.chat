"use client";

import { useState } from "react";
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
import { useRenameConversation } from "@/lib/hooks/mutations/useRenameConversation";

export function RenameDialog({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(conversation.title || "");
  const [isComposing, setIsComposing] = useState(false);
  const { mutateAsync: renameConversation } = useRenameConversation();

  const handleSave = async () => {
    await renameConversation({
      conversationId: conversation._id,
      title,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription className="sr-only">
            Update the conversation title.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title..."
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => {
            if (isComposing || e.nativeEvent.isComposing) return;
            if (e.key === "Enter") handleSave();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
