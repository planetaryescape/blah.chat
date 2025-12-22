"use client";

import { useMutation } from "convex/react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/convex/_generated/api";

type DisconnectOption = "keep" | "migrate" | "delete";

export interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisconnectDialog({
  open,
  onOpenChange,
}: DisconnectDialogProps) {
  const [option, setOption] = useState<DisconnectOption>("keep");
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const disconnect = useMutation(api.byod.credentials.disconnect);

  const handleDisconnect = async () => {
    setStatus("processing");
    setError(null);

    try {
      // For now, only support "keep" option
      // migrate and delete would require additional backend work
      if (option !== "keep") {
        toast.info(
          "Migrate and delete options coming soon. Using 'keep' for now.",
        );
      }

      await disconnect({});

      setStatus("success");
      toast.success("BYOD disconnected successfully");
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
            Choose what happens to your data when you disconnect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={option}
            onValueChange={(v) => setOption(v as DisconnectOption)}
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="keep" id="keep" className="mt-1" />
              <div>
                <Label htmlFor="keep" className="font-medium">
                  Keep data on your instance
                </Label>
                <p className="text-sm text-muted-foreground">
                  Data stays on your Convex instance. You can access it via
                  Convex dashboard or reconnect later.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border opacity-50">
              <RadioGroupItem
                value="migrate"
                id="migrate"
                className="mt-1"
                disabled
              />
              <div>
                <Label htmlFor="migrate" className="font-medium">
                  Migrate back to blah.chat (Coming Soon)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Move all your data back to blah.chat servers.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/50 opacity-50">
              <RadioGroupItem
                value="delete"
                id="delete"
                className="mt-1"
                disabled
              />
              <div>
                <Label
                  htmlFor="delete"
                  className="font-medium text-destructive"
                >
                  Delete data from your instance (Coming Soon)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all your data from your Convex instance.
                </p>
              </div>
            </div>
          </RadioGroup>

          {option === "delete" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will permanently delete all your conversations, messages,
                memories, and files from your Convex instance.
              </AlertDescription>
            </Alert>
          )}

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
            variant={option === "delete" ? "destructive" : "default"}
            onClick={handleDisconnect}
            disabled={status === "processing"}
          >
            {status === "processing" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {option === "delete" ? "Delete & Disconnect" : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
