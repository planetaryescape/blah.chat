"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSyncedScroll } from "@/hooks/useSyncedScroll";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ComparisonPanel } from "./ComparisonPanel";
import { ConsolidateDialog } from "./ConsolidateDialog";

type ConsolidationMode = "same-chat" | "new-chat";

interface ComparisonViewProps {
  assistantMessages: Doc<"messages">[];
  comparisonGroupId: string;
  showModelNames: boolean;
  onVote: (winnerId: string, rating: string) => void;
  onConsolidate: (model: string, mode: ConsolidationMode) => void;
  onToggleModelNames: () => void;
  onExit?: () => void;
  hideConsolidateButton?: boolean;
}

export function ComparisonView({
  assistantMessages,
  comparisonGroupId,
  showModelNames,
  onVote,
  onConsolidate,
  onToggleModelNames,
  onExit,
  hideConsolidateButton = false,
}: ComparisonViewProps) {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showConsolidateDialog, setShowConsolidateDialog] = useState(false);
  const [votedMessageId, setVotedMessageId] = useState<string | undefined>();

  const { register } = useSyncedScroll(syncEnabled);
  const isMobile = useMediaQuery("(max-width: 1024px)");

  // Sort messages by creation time
  const sortedMessages = useMemo(() => {
    return [...assistantMessages].sort((a, b) => a.createdAt - b.createdAt);
  }, [assistantMessages]);

  // Calculate aggregate stats
  const totalCost = useMemo(() => {
    return assistantMessages.reduce((sum, m) => sum + (m.cost || 0), 0);
  }, [assistantMessages]);

  const totalInputTokens = useMemo(() => {
    return assistantMessages.reduce((sum, m) => sum + (m.inputTokens || 0), 0);
  }, [assistantMessages]);

  const totalOutputTokens = useMemo(() => {
    return assistantMessages.reduce((sum, m) => sum + (m.outputTokens || 0), 0);
  }, [assistantMessages]);

  // Calculate generation durations (ms)
  const generationDurations = useMemo(() => {
    return sortedMessages.map((msg) => {
      if (!msg.generationCompletedAt) return null; // Still generating or pending
      const duration = msg.generationCompletedAt - msg.createdAt;
      return duration;
    });
  }, [sortedMessages]);

  // Format duration helper
  const formatDuration = (ms: number | null) => {
    if (ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const allComplete = assistantMessages.every((m) => m.status === "complete");

  const handleVote = (winnerId: string, messageIndex: number) => {
    setVotedMessageId(winnerId);
    // Determine rating based on message position
    let rating: "left_better" | "right_better" | "tie" | "both_bad";
    if (sortedMessages.length === 2) {
      rating = messageIndex === 0 ? "left_better" : "right_better";
    } else {
      // For 3-4 models, just mark as winner (could add tie/both_bad buttons)
      rating = "left_better"; // Placeholder - winner concept
    }
    onVote(winnerId, rating);
  };

  const handleConsolidate = (model: string, mode: ConsolidationMode) => {
    setShowConsolidateDialog(false);
    onConsolidate(model, mode);
  };

  // Mobile: Tabs
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b">
          {!hideConsolidateButton && (
            <h3 className="font-medium">
              Comparing {assistantMessages.length} models
            </h3>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {!hideConsolidateButton && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onToggleModelNames}
                className="h-8 w-8"
              >
                {showModelNames ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            )}
            {onExit && (
              <Button size="icon" variant="ghost" onClick={onExit}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue={sortedMessages[0]._id} className="flex-1">
          <TabsList className="w-full justify-start overflow-x-auto sticky top-0 z-10 no-scrollbar px-1">
            {sortedMessages.map((msg, idx) => (
              <TabsTrigger
                key={msg._id}
                value={msg._id}
                className="flex-shrink-0 min-w-[100px]"
              >
                {showModelNames
                  ? msg.model?.split(":")[1] || msg.model
                  : `Model ${idx + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>

          {sortedMessages.map((msg, idx) => (
            <TabsContent key={msg._id} value={msg._id} className="flex-1">
              <ComparisonPanel
                message={msg}
                index={idx}
                showModelName={showModelNames}
                onVote={() => handleVote(msg._id, idx)}
                isVoted={votedMessageId === msg._id}
                hasVoted={votedMessageId !== undefined}
                duration={generationDurations[idx]}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Footer */}
        <div className="p-3 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total Cost</span>
            <span className="font-mono">${totalCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Avg Response Time</span>
            <span className="font-mono">
              {formatDuration(
                generationDurations.filter((d) => d !== null).length > 0
                  ? generationDurations
                      .filter((d) => d !== null)
                      .reduce((a, b) => a! + b!, 0)! /
                      generationDurations.filter((d) => d !== null).length
                  : null,
              )}
            </span>
          </div>
          {allComplete && !hideConsolidateButton && (
            <Button
              onClick={() => setShowConsolidateDialog(true)}
              className="w-full"
              variant="secondary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Consolidate Responses
            </Button>
          )}
        </div>

        <ConsolidateDialog
          open={showConsolidateDialog}
          comparisonGroupId={comparisonGroupId}
          messages={sortedMessages}
          onConfirm={handleConsolidate}
          onClose={() => setShowConsolidateDialog(false)}
        />
      </div>
    );
  }

  // Desktop: Side-by-side grid
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          {!hideConsolidateButton && (
            <>
              <h3 className="font-medium">
                Comparing {assistantMessages.length} models
              </h3>
              <Badge variant="outline">
                {syncEnabled ? "Sync On" : "Sync Off"}
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {!hideConsolidateButton && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSyncEnabled(!syncEnabled)}
              >
                Toggle Sync
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleModelNames}
                className="gap-2"
              >
                {showModelNames ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Names
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Names
                  </>
                )}
              </Button>
            </>
          )}
          {onExit && (
            <Button size="icon" variant="ghost" onClick={onExit}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        className={cn(
          "flex-1 grid gap-4 p-4 overflow-hidden",
          assistantMessages.length === 2 && "grid-cols-2",
          assistantMessages.length === 3 && "grid-cols-3",
          assistantMessages.length === 4 && "grid-cols-2 lg:grid-cols-4",
        )}
      >
        {sortedMessages.map((msg, idx) => (
          <ComparisonPanel
            key={msg._id}
            ref={register}
            message={msg}
            index={idx}
            showModelName={showModelNames}
            onVote={() => handleVote(msg._id, idx)}
            isVoted={votedMessageId === msg._id}
            hasVoted={votedMessageId !== undefined}
            duration={generationDurations[idx]}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Total Cost:</span>
            <span className="font-mono text-lg">${totalCost.toFixed(4)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {totalInputTokens.toLocaleString()} input +{" "}
            {totalOutputTokens.toLocaleString()} output tokens
          </div>
          <div className="text-xs text-muted-foreground">
            Avg response:{" "}
            {formatDuration(
              generationDurations.filter((d) => d !== null).length > 0
                ? generationDurations
                    .filter((d) => d !== null)
                    .reduce((a, b) => a! + b!, 0)! /
                    generationDurations.filter((d) => d !== null).length
                : null,
            )}
          </div>
        </div>

        {allComplete && !hideConsolidateButton && (
          <Button
            onClick={() => setShowConsolidateDialog(true)}
            variant="secondary"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Consolidate Responses
          </Button>
        )}
      </div>

      <ConsolidateDialog
        open={showConsolidateDialog}
        comparisonGroupId={comparisonGroupId}
        messages={sortedMessages}
        onConfirm={handleConsolidate}
        onClose={() => setShowConsolidateDialog(false)}
      />
    </div>
  );
}
