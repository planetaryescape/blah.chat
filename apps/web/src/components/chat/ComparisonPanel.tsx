"use client";

import { Loader2, Square } from "lucide-react";
import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./MarkdownContent";
import { VotingControls } from "./VotingControls";

type MessageWithUser = {
  _id: string;
  role: "user" | "assistant" | "system";
  content: string;
  partialContent?: string;
  status: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
};

interface ComparisonPanelProps {
  message: MessageWithUser;
  index: number;
  showModelName: boolean;
  showStats: boolean;
  onVote: () => void;
  isVoted?: boolean;
  hasVoted?: boolean;
  duration?: number | null;
  showVoteControls?: boolean;
  canStop?: boolean;
  isStopping?: boolean;
  onStop?: () => void;
  stopLabel?: string;
}

export const ComparisonPanel = forwardRef<HTMLDivElement, ComparisonPanelProps>(
  (
    {
      message,
      index,
      showModelName,
      showStats,
      onVote,
      isVoted,
      hasVoted,
      duration,
      showVoteControls,
      canStop,
      isStopping,
      onStop,
      stopLabel,
    },
    ref,
  ) => {
    const isGenerating = ["pending", "generating"].includes(message.status);
    const displayContent = message.partialContent || message.content || "";
    const modelName = message.model?.split(":")[1] || message.model;

    // Format duration helper
    const formatDuration = (ms: number | null) => {
      if (ms === null) return "—";
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
      <div
        ref={ref}
        className="flex flex-col h-full border rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-col items-start gap-2 p-3 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-2 w-full">
            <div>
              {showModelName ? (
                <Badge variant="secondary">{modelName}</Badge>
              ) : (
                <Badge variant="outline">Model {index + 1}</Badge>
              )}
            </div>
            {(canStop || isStopping) && onStop && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onStop}
                disabled={isStopping}
                aria-label={`Stop ${stopLabel || modelName || `model ${index + 1}`}`}
                data-testid="comparison-stop-session"
              >
                {isStopping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4 fill-current" />
                )}
              </Button>
            )}
          </div>
          {showStats && (
            <div className="text-xs text-muted-foreground flex gap-2 w-full overflow-hidden text-ellipsis whitespace-nowrap pl-2">
              <span>{message.inputTokens?.toLocaleString() || 0} in</span>
              <span>•</span>
              <span>{message.outputTokens?.toLocaleString() || 0} out</span>
              <span>•</span>
              <span className="font-mono">
                ${message.cost?.toFixed(4) || "0.0000"}
              </span>
              {duration !== undefined && (
                <>
                  <span>•</span>
                  <span className="font-mono">{formatDuration(duration)}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayContent ? (
            <MarkdownContent
              content={displayContent}
              isStreaming={isGenerating}
            />
          ) : (
            <div className="flex gap-1 items-center h-6">
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse delay-150" />
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse delay-300" />
            </div>
          )}
        </div>

        {/* Footer - Voting */}
        {message.status === "complete" && showVoteControls && (
          <div className="p-3 border-t">
            <VotingControls
              onVote={onVote}
              isVoted={isVoted}
              hasVoted={hasVoted}
              label="Choose winner"
            />
          </div>
        )}
      </div>
    );
  },
);

ComparisonPanel.displayName = "ComparisonPanel";
