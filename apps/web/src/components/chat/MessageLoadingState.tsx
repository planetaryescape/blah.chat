"use client";

import { Loader2, RefreshCw } from "lucide-react";

interface MessageLoadingStateProps {
  isThinkingModel: boolean;
  isAutoRetrying?: boolean;
  isDecidingModel?: boolean;
  modelName?: string;
}

/**
 * Loading state indicators for AI message generation.
 * Shows either a "Thinking..." label with spinner for reasoning models,
 * "Switching to a better model..." for auto-router retries,
 * or bouncing dots for standard models.
 */
export function MessageLoadingState({
  isThinkingModel,
  isAutoRetrying,
  isDecidingModel,
  modelName,
}: MessageLoadingStateProps) {
  if (isDecidingModel) {
    return (
      <div className="flex items-center gap-2 h-6 text-xs font-medium text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin text-primary" />
        <span>blah.chat is deciding which model to use</span>
      </div>
    );
  }

  if (isAutoRetrying) {
    return (
      <div className="flex items-center gap-2 h-6 text-xs font-medium text-muted-foreground">
        <RefreshCw className="w-3 h-3 animate-spin text-primary" />
        <span>Switching to a better model...</span>
      </div>
    );
  }

  if (isThinkingModel) {
    return (
      <div className="flex items-center gap-2 h-6 text-xs font-medium text-muted-foreground uppercase tracking-widest">
        <Loader2 className="w-3 h-3 animate-spin text-primary" />
        <span>Thinking...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 h-6">
      {modelName && (
        <span className="text-xs text-muted-foreground">
          {modelName} is thinking...
        </span>
      )}
      <div className="typing-indicator flex gap-1 items-center">
        <span
          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
          style={{
            animation: "typing-pulse 0.8s ease-in-out infinite",
            animationDelay: "0ms",
          }}
        />
        <span
          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
          style={{
            animation: "typing-pulse 0.8s ease-in-out infinite",
            animationDelay: "200ms",
          }}
        />
        <span
          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
          style={{
            animation: "typing-pulse 0.8s ease-in-out infinite",
            animationDelay: "400ms",
          }}
        />
      </div>
    </div>
  );
}
