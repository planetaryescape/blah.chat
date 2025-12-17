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
import { Label } from "@/components/ui/label";

interface DeleteAllMemoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoriesCount: number;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation dialog for deleting all memories.
 */
export function DeleteAllMemoriesDialog({
  open,
  onOpenChange,
  memoriesCount,
  onConfirm,
}: DeleteAllMemoriesDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (confirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setConfirmText("");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setConfirmText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete All Memories?</DialogTitle>
          <DialogDescription>
            This will permanently delete all {memoriesCount} memories. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <code className="font-mono font-bold">DELETE</code> to
              confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== "DELETE" || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete All Memories"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
