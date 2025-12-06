"use client";

import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";
import { forwardRef } from "react";
import { MarkdownContent } from "./MarkdownContent";
import { VotingControls } from "./VotingControls";

interface ComparisonPanelProps {
  message: Doc<"messages">;
  index: number;
  showModelName: boolean;
  onVote: () => void;
  isVoted?: boolean;
  hasVoted?: boolean;
  duration?: number | null;
}

export const ComparisonPanel = forwardRef<HTMLDivElement, ComparisonPanelProps>(
  ({ message, index, showModelName, onVote, isVoted, hasVoted, duration }, ref) => {
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
          <div>
            {showModelName ? (
              <Badge variant="secondary">{modelName}</Badge>
            ) : (
              <Badge variant="outline">Model {index + 1}</Badge>
            )}
          </div>
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
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-150" />
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-300" />
            </div>
          )}
        </div>

        {/* Footer - Voting */}
        {message.status === "complete" && (
          <div className="p-3 border-t">
            <VotingControls
              onVote={onVote}
              isVoted={isVoted}
              hasVoted={hasVoted}
              label="This is better"
            />
          </div>
        )}
      </div>
    );
  },
);

ComparisonPanel.displayName = "ComparisonPanel";
