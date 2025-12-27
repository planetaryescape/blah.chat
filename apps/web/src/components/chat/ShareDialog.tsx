"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
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

interface ShareDialogProps {
  conversationId: Id<"conversations">;
}

export function ShareDialog({ conversationId }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | undefined>(7);
  const [anonymize, setAnonymize] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const existingShare = useQuery(api.shares.getByConversation, {
    conversationId,
  });
  const createShare = useAction(api.shares.create);
  const toggleShare = useMutation(api.shares.toggle);

  // Set share URL if exists
  useEffect(() => {
    if (existingShare?.shareId) {
      setShareUrl(`${window.location.origin}/share/${existingShare.shareId}`);
    }
  }, [existingShare]);

  const handleShare = async () => {
    try {
      const shareId = await createShare({
        conversationId,
        password: password || undefined,
        expiresIn,
        anonymizeUsernames: anonymize,
      });

      const url = `${window.location.origin}/share/${shareId}`;
      setShareUrl(url);

      analytics.track("conversation_shared", {
        hasPassword: !!password,
        hasExpiry: !!expiresIn,
        expiresIn,
        anonymizeEnabled: anonymize,
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
      await toggleShare({ conversationId, isActive });
    } catch (error) {
      console.error("Failed to toggle share:", error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (!existingShare) {
      setShareUrl(null);
      setPassword("");
      setExpiresIn(7);
      setAnonymize(false);
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
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Create a shareable link to this conversation
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-toggle">Sharing enabled</Label>
              <Switch
                id="share-toggle"
                checked={existingShare?.isActive ?? true}
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

            {existingShare?.isActive === false ? (
              <p className="text-sm text-destructive">
                ⚠️ Sharing is disabled. Anyone with the link will see a "revoked"
                message.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view the conversation
                {existingShare?.password && " (password required)"}
                {existingShare?.expiresAt &&
                  ` (expires ${new Date(existingShare.expiresAt).toLocaleDateString()})`}
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

            <div className="flex items-center justify-between">
              <Label htmlFor="anonymize">Anonymize usernames</Label>
              <Switch
                id="anonymize"
                checked={anonymize}
                onCheckedChange={setAnonymize}
              />
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
