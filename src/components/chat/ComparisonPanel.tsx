"use client";

import { ModelIcon } from "@/components/brand/ModelIcon";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";
import { getModelConfig } from "@/lib/ai/models";
import { forwardRef } from "react";
import { MarkdownContent } from "./MarkdownContent";
import { VotingControls } from "./VotingControls";

interface ComparisonPanelProps {
  message: Doc<"messages">;
  index: number;
  showModelName: boolean;
  onVote: () => void;
  isVoted?: boolean;
}

export const ComparisonPanel = forwardRef<HTMLDivElement, ComparisonPanelProps>(
  ({ message, index, showModelName, onVote, isVoted }, ref) => {
    const isGenerating = ["pending", "generating"].includes(message.status);
    const displayContent = message.partialContent || message.content || "";
    const modelConfig = message.model ? getModelConfig(message.model) : null;
    const modelName = modelConfig?.name || message.model?.split(":")[1] || message.model;

    return (
      <div
        ref={ref}
        className="flex flex-col h-full border rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-col gap-2 p-4 border-b bg-muted/20 backdrop-blur-sm relative group-hover:bg-muted/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ModelIcon
                modelId={modelName}
                className="w-8 h-8 p-1.5 bg-background rounded-lg shadow-sm border border-border/50"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-none tracking-tight">
                  {showModelName ? modelName : `Model ${index + 1}`}
                </span>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60">
                  {message.model}
                </div>
              </div>
            </div>
            {isGenerating && (
              <Badge variant="outline" className="animate-pulse border-primary/20 text-primary h-5 text-[10px] px-1.5">
                Generating
              </Badge>
            )}
            {message.status === "error" && (
              <Badge variant="destructive" className="h-5 text-[10px] px-1.5">Error</Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1">
            <div className="flex flex-col px-2 py-1 rounded bg-background/50 border border-border/20">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Input</span>
              <span className="text-xs font-mono font-medium">{message.inputTokens?.toLocaleString() || 0}</span>
            </div>
            <div className="flex flex-col px-2 py-1 rounded bg-background/50 border border-border/20">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Output</span>
              <span className="text-xs font-mono font-medium">{message.outputTokens?.toLocaleString() || 0}</span>
            </div>
            <div className="flex flex-col px-2 py-1 rounded bg-background/50 border border-border/20">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Cost</span>
              <span className="text-xs font-mono font-medium">${message.cost?.toFixed(5) || "0.00000"}</span>
            </div>
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
              label="This is better"
            />
          </div>
        )}
      </div>
    );
  },
);

ComparisonPanel.displayName = "ComparisonPanel";
