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
  mode?: "all" | "selected";
}

/**
 * Confirmation dialog for deleting memories.
 * Supports "all" mode (requires typing DELETE) and "selected" mode (simpler confirmation).
 */
export function DeleteAllMemoriesDialog({
  open,
  onOpenChange,
  memoriesCount,
  onConfirm,
  mode = "all",
}: DeleteAllMemoriesDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isAllMode = mode === "all";
  const requiresTyping = isAllMode || memoriesCount > 10;
  const canConfirm = requiresTyping ? confirmText === "DELETE" : true;

  const handleConfirm = async () => {
    if (!canConfirm) return;
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
          <DialogTitle>
            {isAllMode ? "Delete All Memories?" : "Delete Selected Memories?"}
          </DialogTitle>
          <DialogDescription>
            {isAllMode
              ? `This will permanently delete all ${memoriesCount} memories. This action cannot be undone.`
              : `This will permanently delete ${memoriesCount} ${memoriesCount === 1 ? "memory" : "memories"}. This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        {requiresTyping && (
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isDeleting}
          >
            {isDeleting
              ? "Deleting..."
              : isAllMode
                ? "Delete All Memories"
                : `Delete ${memoriesCount} ${memoriesCount === 1 ? "Memory" : "Memories"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
