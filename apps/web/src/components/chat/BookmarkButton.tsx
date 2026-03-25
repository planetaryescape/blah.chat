"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { analytics } from "@/lib/analytics";
import {
  useCreateBookmark,
  useRemoveBookmark,
  useUpdateBookmark,
} from "@/lib/hooks/mutations/useBookmarkMutations";
import { useBookmarkByMessage } from "@/lib/hooks/queries/useBookmarks";

interface BookmarkButtonProps {
  messageId: string;
  conversationId: string;
}

export function BookmarkButton({
  messageId,
  conversationId,
}: BookmarkButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  const isTempMessage =
    typeof messageId === "string" && messageId.startsWith("temp-");

  const { data: existingBookmark } = useBookmarkByMessage(
    isTempMessage ? null : messageId,
  );
  const createBookmarkMutation = useCreateBookmark();
  const removeBookmarkMutation = useRemoveBookmark();
  const updateBookmarkMutation = useUpdateBookmark();

  if (isTempMessage) {
    return null;
  }

  const isBookmarked = !!existingBookmark;

  const handleToggleBookmark = () => {
    if (isBookmarked && existingBookmark) {
      removeBookmarkMutation.mutate(
        { bookmarkId: existingBookmark._id },
        {
          onSuccess: () => {
            toast.success("Bookmark removed");
            analytics.track("bookmark_deleted", { source: "message" });
          },
          onError: () => toast.error("Failed to remove bookmark"),
        },
      );
      return;
    }

    setShowDialog(true);
  };

  const handleSaveBookmark = () => {
    const tagList = tags ? tags.split(",").map((tag) => tag.trim()) : undefined;

    const onSettled = () => {
      setShowDialog(false);
      setNote("");
      setTags("");
    };

    if (isBookmarked && existingBookmark) {
      updateBookmarkMutation.mutate(
        {
          bookmarkId: existingBookmark._id,
          note: note || undefined,
          tags: tagList,
        },
        {
          onSuccess: () => {
            toast.success("Bookmark updated");
            analytics.track("bookmark_updated", {
              hasNote: !!note,
              tagCount: tagList?.length || 0,
            });
            onSettled();
          },
          onError: () => toast.error("Failed to save bookmark"),
        },
      );
    } else {
      createBookmarkMutation.mutate(
        { messageId, conversationId, note: note || undefined, tags: tagList },
        {
          onSuccess: () => {
            toast.success("Bookmark created");
            analytics.track("bookmark_created", {
              source: "message",
              hasNote: !!note,
              tagCount: tagList?.length || 0,
            });
            onSettled();
          },
          onError: () => toast.error("Failed to save bookmark"),
        },
      );
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
            onClick={handleToggleBookmark}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isBookmarked ? "Remove bookmark" : "Bookmark message"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isBookmarked ? "Remove bookmark (B)" : "Bookmark message (B)"}</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isBookmarked ? "Edit Bookmark" : "Add Bookmark"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note about why you bookmarked this..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                placeholder="important, code, reference (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBookmark}>
              {isBookmarked ? "Update" : "Save"} Bookmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
