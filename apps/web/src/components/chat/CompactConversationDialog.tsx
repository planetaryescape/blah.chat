"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface CompactConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: "threshold" | "model-switch";
  /** Current context usage percentage (for threshold trigger) */
  currentPercentage?: number;
  /** Target model info (for model-switch trigger) */
  targetModel?: {
    id: string;
    name: string;
    contextWindow: number;
  };
  /** Current token usage (for model-switch trigger) */
  currentTokens?: number;
  onStartFresh: () => void;
  onCompact: () => void;
  isCompacting: boolean;
}

export function CompactConversationDialog({
  open,
  onOpenChange,
  trigger,
  currentPercentage,
  targetModel,
  currentTokens,
  onStartFresh,
  onCompact,
  isCompacting,
}: CompactConversationDialogProps) {
  const isThreshold = trigger === "threshold";

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {isThreshold
              ? "Context Window Nearly Full"
              : `Cannot Switch to ${targetModel?.name || "Model"}`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isThreshold ? (
                <p>
                  This conversation is at{" "}
                  <span className="font-medium text-foreground">
                    {currentPercentage}%
                  </span>{" "}
                  capacity. You won't be able to send more messages.
                </p>
              ) : (
                <>
                  <p>
                    Current usage:{" "}
                    <span className="font-medium text-foreground">
                      {formatTokens(currentTokens || 0)} tokens
                    </span>
                  </p>
                  <p>
                    {targetModel?.name} limit:{" "}
                    <span className="font-medium text-foreground">
                      {formatTokens(targetModel?.contextWindow || 0)} tokens
                    </span>
                  </p>
                  <p>Compact this conversation to switch models.</p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel disabled={isCompacting}>Cancel</AlertDialogCancel>
          {isThreshold && (
            <Button
              variant="outline"
              onClick={onStartFresh}
              disabled={isCompacting}
            >
              Start Fresh
            </Button>
          )}
          <AlertDialogAction onClick={onCompact} disabled={isCompacting}>
            {isCompacting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compacting...
              </>
            ) : isThreshold ? (
              "Compact & Continue"
            ) : (
              "Compact & Switch"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
