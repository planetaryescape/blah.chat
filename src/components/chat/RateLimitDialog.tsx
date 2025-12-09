"use client";

import { AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RateLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
}

export function RateLimitDialog({
  open,
  onOpenChange,
  limit,
}: RateLimitDialogProps) {
  const [timeUntilReset, setTimeUntilReset] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    if (open) {
      updateTime();
      const interval = setInterval(updateTime, 60000); // update every minute
      return () => clearInterval(interval);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle>Daily Limit Reached</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              You've reached your daily limit of{" "}
              <strong>{limit} messages</strong>.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                Resets in{" "}
                <strong className="text-foreground">{timeUntilReset}</strong>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your message count resets at midnight (local time). Come back
              tomorrow to continue chatting!
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mt-2">
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
