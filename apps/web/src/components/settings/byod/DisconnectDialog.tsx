"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisconnected?: () => void;
}

export function DisconnectDialog({
  open,
  onOpenChange,
  onDisconnected,
}: DisconnectDialogProps) {
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setStatus("processing");
    setError(null);

    try {
      const res = await fetch("/api/v1/byod", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "Disconnect failed");
      }

      setStatus("success");
      toast.success("BYOD disconnected successfully");
      onDisconnected?.();
      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
      }, 1000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect BYOD</DialogTitle>
          <DialogDescription>
            Your data will remain on your Neon instance. You can reconnect
            later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              After disconnecting, your conversations will use the main
              database. Data on your Neon instance will not be deleted.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={status === "processing"}
          >
            {status === "processing" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
