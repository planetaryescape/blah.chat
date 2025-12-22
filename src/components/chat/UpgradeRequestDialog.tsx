"use client";

import { useMutation } from "convex/react";
import { Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";

interface UpgradeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: string;
}

export function UpgradeRequestDialog({
  open,
  onOpenChange,
  currentTier,
}: UpgradeRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createFeedback = useMutation(api.feedback.createFeedback);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createFeedback({
        feedbackType: "feature",
        description: `Upgrade request: User on ${currentTier} tier requesting pro model access`,
        page: "/chat",
      });
      toast.success("Request sent! Admins will review your upgrade request.");
      onOpenChange(false);
    } catch (_error) {
      toast.error("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle>Pro Models</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              Pro models require an upgraded account. We haven't set up payments
              yet, but you can request access.
            </p>
            <p className="text-xs text-muted-foreground">
              Your request will be reviewed by an admin who can upgrade your
              account manually.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
