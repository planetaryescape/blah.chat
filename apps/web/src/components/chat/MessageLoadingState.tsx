"use client";

import { Loader2 } from "lucide-react";

interface MessageLoadingStateProps {
  isThinkingModel: boolean;
}

/**
 * Loading state indicators for AI message generation.
 * Shows either a "Thinking..." label with spinner for reasoning models,
 * or bouncing dots for standard models.
 */
export function MessageLoadingState({
  isThinkingModel,
}: MessageLoadingStateProps) {
  if (isThinkingModel) {
    return (
      <div className="flex items-center gap-2 h-6 text-xs font-medium text-muted-foreground uppercase tracking-widest">
        <Loader2 className="w-3 h-3 animate-spin text-primary" />
        <span>Thinking...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-1 items-center h-6">
      <span
        className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
