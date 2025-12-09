"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { analytics } from "@/lib/analytics";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface NoteShareDialogProps {
  noteId: Id<"notes">;
}

export function NoteShareDialog({ noteId }: NoteShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | undefined>(7);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const note = useQuery(api.notes.getNote, { noteId });
  const createShare = useAction(api.notes.createShare);
  const toggleShare = useMutation(api.notes.toggleShare);

  // Set share URL if exists
  useEffect(() => {
    if (note?.shareId) {
      setShareUrl(`${window.location.origin}/share/${note.shareId}`);
    }
  }, [note]);

  const handleShare = async () => {
    try {
      const shareId = await createShare({
        noteId,
        password: password || undefined,
        expiresIn,
      });

      const url = `${window.location.origin}/share/${shareId}`;
      setShareUrl(url);

      analytics.track("note_shared", {
        hasPassword: !!password,
        expiresIn,
      });
    } catch (error) {
      console.error("Failed to create share:", error);
    }
  };

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggle = async (isActive: boolean) => {
    try {
      await toggleShare({ noteId, isActive });
    } catch (error) {
      console.error("Failed to toggle share:", error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (!note?.shareId) {
      setShareUrl(null);
      setPassword("");
      setExpiresIn(7);
    }
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>
            Create a shareable link to this note
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-toggle">Sharing enabled</Label>
              <Switch
                id="share-toggle"
                checked={note?.isPublic ?? true}
                onCheckedChange={handleToggle}
              />
            </div>

            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly />
              <Button onClick={copyToClipboard} size="icon">
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {note?.isPublic === false ? (
              <p className="text-sm text-destructive">
                ⚠️ Sharing is disabled. Anyone with the link will see a "revoked"
                message.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view the note
                {note?.sharePassword && " (password required)"}
                {note?.shareExpiresAt &&
                  ` (expires ${new Date(note.shareExpiresAt).toLocaleDateString()})`}
                .
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expires in</Label>
              <Select
                value={expiresIn?.toString() || "never"}
                onValueChange={(value) =>
                  setExpiresIn(value === "never" ? undefined : Number(value))
                }
              >
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          {shareUrl ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <Button onClick={handleShare}>Create Share Link</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
