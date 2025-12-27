"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Copy, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RemoteQRModalProps {
  open: boolean;
  onClose: () => void;
  presentationId: Id<"presentations">;
  totalSlides: number;
  onSessionCreated?: (sessionId: Id<"presentationSessions">) => void;
}

export function RemoteQRModal({
  open,
  onClose,
  presentationId,
  totalSlides,
  onSessionCreated,
}: RemoteQRModalProps) {
  const [copied, setCopied] = useState(false);
  const [sessionId, setSessionId] = useState<Id<"presentationSessions"> | null>(
    null,
  );

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const createSession = useMutation(api.presentationSessions.create);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const refreshCode = useMutation(api.presentationSessions.refreshCode);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const session = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.presentationSessions.get,
    sessionId ? { sessionId } : "skip",
  );

  // Create session when modal opens
  useEffect(() => {
    if (open && !sessionId) {
      createSession({ presentationId, totalSlides }).then((result) => {
        setSessionId(result.sessionId);
        onSessionCreated?.(result.sessionId);
      });
    }
  }, [
    open,
    sessionId,
    createSession,
    presentationId,
    totalSlides,
    onSessionCreated,
  ]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSessionId(null);
      setCopied(false);
    }
  }, [open]);

  const handleRefreshCode = useCallback(async () => {
    if (!sessionId) return;
    await refreshCode({ sessionId });
  }, [sessionId, refreshCode]);

  const handleCopyCode = useCallback(() => {
    if (!session?.sessionCode) return;
    navigator.clipboard.writeText(session.sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [session?.sessionCode]);

  const handleCopyUrl = useCallback(() => {
    if (!session?.sessionCode) return;
    const url = `${window.location.origin}/slides/remote?code=${session.sessionCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [session?.sessionCode]);

  const remoteUrl = session?.sessionCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/slides/remote?code=${session.sessionCode}`
    : "";

  // Format expiry time
  const getExpiryText = () => {
    if (!session?.sessionCodeExpiresAt) return "";
    const remaining = Math.max(
      0,
      Math.floor((session.sessionCodeExpiresAt - Date.now()) / 1000),
    );
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Remote Control
          </DialogTitle>
          <DialogDescription>
            Scan the QR code or enter the code on your phone to control this
            presentation remotely.
          </DialogDescription>
        </DialogHeader>

        {session ? (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCode value={remoteUrl} size={200} />
            </div>

            {/* Session code */}
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                Or enter this code:
              </div>
              <div className="flex items-center justify-center gap-2">
                <code className="text-3xl font-mono font-bold tracking-widest">
                  {session.sessionCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCode}
                  title="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Code expires in {getExpiryText()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyUrl}
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleRefreshCode}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Code
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground text-center">
              <p>
                Go to{" "}
                <code className="bg-muted px-1 rounded">
                  {typeof window !== "undefined" ? window.location.host : ""}
                  /slides/remote
                </code>{" "}
                on your phone
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
