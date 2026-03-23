"use client";

import { Archive, Bookmark, Copy, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSDKClient } from "@/lib/api/sdkClient";
import { ConfirmDialog } from "./ConfirmDialog";

interface BulkActionToolbarProps {
  selectedCount: number;
  selectedMessages: Array<{
    _id: string;
    conversationId: string;
    content: string;
    role: "user" | "assistant" | "system";
  }>;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  selectedMessages,
  onClearSelection,
  onActionComplete,
}: BulkActionToolbarProps) {
  const sdk = useSDKClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  // Group messages by conversation
  const conversationIds = useMemo(
    () =>
      Array.from(
        new Set(selectedMessages.map((message) => message.conversationId)),
      ),
    [selectedMessages],
  );

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    return Promise.all(
      conversationIds.map((conversationId) =>
        sdk.deleteConversation(conversationId),
      ),
    )
      .then(() => {
        // Clear drafts for all deleted conversations
        for (const id of conversationIds) {
          sessionStorage.removeItem(`draft-${id}`);
        }
        toast.success(`Deleted ${conversationIds.length} conversation(s)`);
        onActionComplete();
        onClearSelection();
      })
      .catch((error) => {
        toast.error("Failed to delete conversations");
        console.error(error);
      })
      .finally(() => {
        setIsDeleting(false);
        setShowDeleteDialog(false);
      });
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    return Promise.all(
      conversationIds.map((conversationId) =>
        sdk.archiveConversation(conversationId),
      ),
    )
      .then(() => {
        toast.success(`Archived ${conversationIds.length} conversation(s)`);
        onActionComplete();
        onClearSelection();
      })
      .catch((error) => {
        toast.error("Failed to archive conversations");
        console.error(error);
      })
      .finally(() => {
        setIsArchiving(false);
      });
  };

  const handleBookmark = async () => {
    setIsBookmarking(true);
    return sdk
      .bulkCreateBookmarks({
        messageIds: selectedMessages.map((message) => message._id),
      })
      .then((result) => {
        toast.success(`Bookmarked ${result.bookmarkedCount} message(s)`);
        onClearSelection();
      })
      .catch((error) => {
        toast.error("Failed to bookmark messages");
        console.error(error);
      })
      .finally(() => {
        setIsBookmarking(false);
      });
  };

  const handleCopy = () => {
    const text = selectedMessages
      .map((message) => `[${message.role}] ${message.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${selectedCount} message(s) to clipboard`);
    onClearSelection();
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete ({conversationIds.length} conv)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={isArchiving}
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              Archive ({conversationIds.length} conv)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBookmark}
              disabled={isBookmarking}
            >
              <Bookmark className="w-3.5 h-3.5 mr-1" />
              Bookmark
            </Button>

            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy text
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="ml-auto"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete conversations?"
        description={`This will permanently delete ${conversationIds.length} conversation(s) and all their messages. This action cannot be undone.`}
        onConfirm={confirmDelete}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
