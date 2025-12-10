"use client";

import { useMutation, useQuery } from "convex/react";
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
import { analytics } from "@/lib/analytics";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface BookmarkButtonProps {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
}

export function BookmarkButton({
  messageId,
  conversationId,
}: BookmarkButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  const existingBookmark = useQuery(api.bookmarks.getByMessage, { messageId });
  const createBookmark = useMutation(api.bookmarks.create);
  const removeBookmark = useMutation(api.bookmarks.remove);
  const updateBookmark = useMutation(api.bookmarks.update);

  const isBookmarked = !!existingBookmark;

  const handleToggleBookmark = async () => {
    if (isBookmarked && existingBookmark) {
      try {
        await removeBookmark({ bookmarkId: existingBookmark._id });
        toast.success("Bookmark removed");

        // Track bookmark deletion
        analytics.track("bookmark_deleted", {
          source: "message",
        });
      } catch (_error) {
        toast.error("Failed to remove bookmark");
      }
    } else {
      setShowDialog(true);
    }
  };

  const handleSaveBookmark = async () => {
    try {
      const tagList = tags ? tags.split(",").map((t: any) => t.trim()) : undefined;

      if (isBookmarked && existingBookmark) {
        await updateBookmark({
          bookmarkId: existingBookmark._id,
          note: note || undefined,
          tags: tagList,
        });
        toast.success("Bookmark updated");

        // Track bookmark update
        analytics.track("bookmark_updated", {
          hasNote: !!note,
          tagCount: tagList?.length || 0,
        });
      } else {
        await createBookmark({
          messageId,
          conversationId,
          note: note || undefined,
          tags: tagList,
        });
        toast.success("Bookmark created");

        // Track bookmark creation
        analytics.track("bookmark_created", {
          source: "message",
          hasNote: !!note,
          tagCount: tagList?.length || 0,
        });
      }
      setShowDialog(false);
      setNote("");
      setTags("");
    } catch (_error) {
      toast.error("Failed to save bookmark");
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
        onClick={handleToggleBookmark}
        title={isBookmarked ? "Remove bookmark (B)" : "Bookmark message (B)"}
      >
        {isBookmarked ? (
          <BookmarkCheck className="h-4 w-4 text-primary" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </Button>

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
