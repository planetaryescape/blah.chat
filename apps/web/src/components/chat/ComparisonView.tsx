"use client";

import { Eye, EyeOff, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useComparisonGroupState } from "@/hooks/useComparisonGroupState";
import { useSyncedScroll } from "@/hooks/useSyncedScroll";
import { useUserPreference } from "@/hooks/useUserPreference";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ComparisonPanel } from "./ComparisonPanel";
import { ConsolidateDialog } from "./ConsolidateDialog";

type ConsolidationMode = "same-chat" | "new-chat";
type VoteOutcome = "winner" | "tie" | "both_bad";

type MessageWithUser = {
  _id: string;
  role: "user" | "assistant" | "system";
  content: string;
  partialContent?: string;
  status: string;
  model?: string;
  comparisonGroupId?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  generationCompletedAt?: number | null;
  createdAt: number;
  senderUser?: { name?: string; imageUrl?: string } | null;
};

interface ComparisonViewProps {
  assistantMessages: MessageWithUser[];
  comparisonGroupId: string;
  showModelNames: boolean;
  onVote: (
    winnerId: string | undefined,
    outcome: VoteOutcome,
  ) => Promise<void> | void;
  onConsolidate: (
    model: string,
    mode: ConsolidationMode,
  ) => Promise<void> | void;
  onToggleModelNames: () => void;
  onExit?: () => void;
  hideConsolidateButton?: boolean;
  hideVoteControls?: boolean;
}

function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function isTerminalMessageStatus(status: string) {
  return ["complete", "stopped", "cancelled", "error"].includes(status);
}

function isSessionStopping(status?: string | null) {
  return status === "cancelling";
}

function isSessionStoppable(status?: string | null) {
  return status === "pending" || status === "running";
}

function resolveComparisonMessageStatus(input: {
  localStatus: string;
  assistantStatus?: string;
  sessionStatus?: string | null;
}) {
  const baseStatus = input.assistantStatus ?? input.localStatus;

  if (
    input.sessionStatus &&
    isTerminalMessageStatus(input.sessionStatus) &&
    !isTerminalMessageStatus(baseStatus)
  ) {
    return input.sessionStatus;
  }

  if (
    input.sessionStatus === "cancelling" &&
    !isTerminalMessageStatus(baseStatus)
  ) {
    return input.sessionStatus;
  }

  return baseStatus;
}

function mergeAssistantMessageState(
  message: MessageWithUser,
  serverState?: {
    content?: string;
    status: string;
    model?: string | null;
  },
  sessionState?: {
    status: string;
  } | null,
): MessageWithUser {
  if (!serverState && !sessionState) {
    return message;
  }

  const effectiveStatus = resolveComparisonMessageStatus({
    localStatus: message.status,
    assistantStatus: serverState?.status,
    sessionStatus: sessionState?.status,
  });
  const effectiveContent = serverState?.content ?? message.content;

  return {
    ...message,
    content: effectiveContent,
    status: effectiveStatus,
    model: serverState?.model ?? message.model,
    partialContent:
      ["pending", "streaming", "running", "generating", "cancelling"].includes(
        effectiveStatus,
      ) && effectiveContent
        ? effectiveContent
        : undefined,
  };
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
  hideVoteControls = false,
}: ComparisonViewProps) {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showConsolidateDialog, setShowConsolidateDialog] = useState(false);
  const [pendingVote, setPendingVote] = useState<{
    outcome: VoteOutcome;
    winnerId?: string;
  } | null>(null);

  const showStats = useUserPreference("showComparisonStatistics");
  const { register } = useSyncedScroll(syncEnabled);
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const {
    comparisonGroup,
    stopGroup,
    stopSession,
    refetch,
    isStoppingGroup,
    stoppingSessionIds,
  } = useComparisonGroupState(comparisonGroupId);

  const sortedMessages = useMemo(
    () =>
      [...assistantMessages]
        .map((message) =>
          mergeAssistantMessageState(
            message,
            comparisonGroup?.assistantMessagesById?.[message._id],
            comparisonGroup?.sessionsByMessageId?.[message._id],
          ),
        )
        .sort((a, b) => a.createdAt - b.createdAt),
    [
      assistantMessages,
      comparisonGroup?.assistantMessagesById,
      comparisonGroup?.sessionsByMessageId,
    ],
  );

  const totalCost = useMemo(
    () => sortedMessages.reduce((sum, message) => sum + (message.cost || 0), 0),
    [sortedMessages],
  );
  const totalInputTokens = useMemo(
    () =>
      sortedMessages.reduce(
        (sum, message) => sum + (message.inputTokens || 0),
        0,
      ),
    [sortedMessages],
  );
  const totalOutputTokens = useMemo(
    () =>
      sortedMessages.reduce(
        (sum, message) => sum + (message.outputTokens || 0),
        0,
      ),
    [sortedMessages],
  );
  const generationDurations = useMemo(
    () =>
      sortedMessages.map((message) =>
        !message.generationCompletedAt
          ? null
          : message.generationCompletedAt - message.createdAt,
      ),
    [sortedMessages],
  );

  const allTerminal = sortedMessages.every((message) =>
    isTerminalMessageStatus(message.status),
  );
  const needsComparisonRefresh = useMemo(() => {
    if (!comparisonGroup) {
      return false;
    }

    return sortedMessages.some((message) => {
      const serverMessage =
        comparisonGroup.assistantMessagesById?.[message._id];
      const sessionState = comparisonGroup.sessionsByMessageId?.[message._id];
      const effectiveStatus =
        serverMessage?.status ?? sessionState?.status ?? message.status;
      const effectiveContent = serverMessage?.content ?? message.content;

      if (!isTerminalMessageStatus(effectiveStatus)) {
        return true;
      }

      return effectiveStatus === "complete" && !effectiveContent;
    });
  }, [comparisonGroup, sortedMessages]);
  const displayVote = pendingVote
    ? {
        outcome: pendingVote.outcome,
        winnerMessageId: pendingVote.winnerId ?? null,
        votedAt: Date.now(),
      }
    : (comparisonGroup?.latestVote ?? null);
  const activeSessions = Object.values(
    comparisonGroup?.sessionsByMessageId ?? {},
  ).filter(
    (session) =>
      isSessionStoppable(session.status) || isSessionStopping(session.status),
  );

  useEffect(() => {
    if (!needsComparisonRefresh) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refetch();
    }, 1_500);

    return () => window.clearInterval(intervalId);
  }, [needsComparisonRefresh, refetch]);

  const trackVote = (outcome: VoteOutcome, winnerId?: string) => {
    const winnerMessage = sortedMessages.find(
      (message) => message._id === winnerId,
    );
    analytics.track("comparison_voted", {
      outcome,
      winnerModel: winnerMessage?.model,
      modelCount: sortedMessages.length,
      comparisonGroupId,
    });
  };

  const { run: submitVote } = useAsyncAction(
    async (outcome: VoteOutcome, winnerId?: string) => {
      setPendingVote({ outcome, winnerId });
      await Promise.resolve(onVote(winnerId, outcome));
      await refetch();
      trackVote(outcome, winnerId);
      setPendingVote(null);
    },
    { onError: () => setPendingVote(null) },
  );

  const handleConsolidate = async (model: string, mode: ConsolidationMode) => {
    setShowConsolidateDialog(false);
    await Promise.resolve(onConsolidate(model, mode));
    analytics.track("consolidation_created", {
      mode,
      model,
      modelCount: sortedMessages.length,
    });
  };

  const renderOutcomeButtons = (mobile = false) => {
    if (hideVoteControls || !allTerminal) {
      return null;
    }

    return (
      <div className={cn("flex gap-2", mobile ? "flex-col" : "flex-wrap")}>
        <Button
          size="sm"
          variant={displayVote?.outcome === "tie" ? "default" : "outline"}
          onClick={() => submitVote("tie")}
          disabled={pendingVote !== null}
          aria-label="Mark tie"
          data-testid="comparison-vote-tie"
        >
          Mark tie
        </Button>
        <Button
          size="sm"
          variant={displayVote?.outcome === "both_bad" ? "default" : "outline"}
          onClick={() => submitVote("both_bad")}
          disabled={pendingVote !== null}
          aria-label="Mark both bad"
          data-testid="comparison-vote-both-bad"
        >
          Mark both bad
        </Button>
      </div>
    );
  };

  const renderHeaderActions = () => (
    <>
      {!hideConsolidateButton && (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSyncEnabled((current) => !current)}
          >
            Toggle Sync
          </Button>
          {activeSessions.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void stopGroup()}
              disabled={isStoppingGroup}
              aria-label="Stop comparison"
              data-testid="comparison-stop-group"
            >
              Stop comparison
            </Button>
          )}
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
    </>
  );

  const renderFooter = (mobile = false) => {
    const consolidateButton =
      allTerminal && !hideConsolidateButton ? (
        <Button
          onClick={() => setShowConsolidateDialog(true)}
          variant="secondary"
          className={cn(mobile ? "w-full" : !showStats ? "ml-auto" : "")}
          data-testid="comparison-consolidate"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Consolidate Responses
        </Button>
      ) : null;

    if (mobile) {
      return (
        <div className="p-3 border-t space-y-2">
          {showStats && (
            <>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Cost</span>
                <span className="font-mono">${totalCost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Avg Response Time</span>
                <span className="font-mono">
                  {formatDuration(
                    generationDurations.filter((value) => value !== null)
                      .length > 0
                      ? generationDurations
                          .filter((value) => value !== null)
                          .reduce((sum, value) => sum + value!, 0) /
                          generationDurations.filter((value) => value !== null)
                            .length
                      : null,
                  )}
                </span>
              </div>
            </>
          )}
          {renderOutcomeButtons(true)}
          {consolidateButton}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-3 p-3 border-t">
        {showStats ? (
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
                generationDurations.filter((value) => value !== null).length > 0
                  ? generationDurations
                      .filter((value) => value !== null)
                      .reduce((sum, value) => sum + value!, 0) /
                      generationDurations.filter((value) => value !== null)
                        .length
                  : null,
              )}
            </div>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {renderOutcomeButtons(false)}
          {consolidateButton}
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full" data-testid="comparison-view">
        <div className="flex items-center justify-between p-3 border-b">
          {!hideConsolidateButton && (
            <h3 className="font-medium">
              Comparing {assistantMessages.length} models
            </h3>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {renderHeaderActions()}
          </div>
        </div>

        <Tabs defaultValue={sortedMessages[0]?._id} className="flex-1">
          <TabsList className="w-full justify-start overflow-x-auto sticky top-0 z-10 no-scrollbar px-1">
            {sortedMessages.map((message, index) => (
              <TabsTrigger
                key={message._id}
                value={message._id}
                className="flex-shrink-0 min-w-[100px]"
              >
                {showModelNames
                  ? message.model?.split(":")[1] || message.model
                  : `Model ${index + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>

          {sortedMessages.map((message, index) => {
            const sessionState =
              comparisonGroup?.sessionsByMessageId[message._id] ?? null;
            const modelName =
              message.model?.split(":")[1] ||
              message.model ||
              `Model ${index + 1}`;
            const isStopping =
              !!sessionState?.sessionId &&
              stoppingSessionIds.includes(sessionState.sessionId);

            return (
              <TabsContent
                key={message._id}
                value={message._id}
                className="flex-1"
              >
                <ComparisonPanel
                  message={message}
                  index={index}
                  showModelName={showModelNames}
                  showStats={showStats}
                  onVote={() => void submitVote("winner", message._id)}
                  isVoted={displayVote?.winnerMessageId === message._id}
                  hasVoted={!!displayVote}
                  duration={generationDurations[index]}
                  showVoteControls={!hideVoteControls && allTerminal}
                  canStop={isSessionStoppable(sessionState?.status)}
                  isStopping={
                    isStopping || isSessionStopping(sessionState?.status)
                  }
                  onStop={() => void stopSession(message._id)}
                  stopLabel={modelName}
                />
              </TabsContent>
            );
          })}
        </Tabs>

        {renderFooter(true)}

        <ConsolidateDialog
          open={showConsolidateDialog}
          comparisonGroupId={comparisonGroupId}
          messages={sortedMessages}
          onConfirm={(model, mode) => void handleConsolidate(model, mode)}
          onClose={() => setShowConsolidateDialog(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="comparison-view">
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
          {renderHeaderActions()}
        </div>
      </div>

      <div
        className={cn(
          "flex-1 grid gap-4 p-4 overflow-hidden",
          assistantMessages.length === 2 && "grid-cols-2",
          assistantMessages.length === 3 && "grid-cols-3",
          assistantMessages.length === 4 && "grid-cols-2 lg:grid-cols-4",
        )}
      >
        {sortedMessages.map((message, index) => {
          const sessionState =
            comparisonGroup?.sessionsByMessageId[message._id] ?? null;
          const modelName =
            message.model?.split(":")[1] ||
            message.model ||
            `Model ${index + 1}`;
          const isStopping =
            !!sessionState?.sessionId &&
            stoppingSessionIds.includes(sessionState.sessionId);

          return (
            <ComparisonPanel
              key={message._id}
              ref={register}
              message={message}
              index={index}
              showModelName={showModelNames}
              showStats={showStats}
              onVote={() => void submitVote("winner", message._id)}
              isVoted={displayVote?.winnerMessageId === message._id}
              hasVoted={!!displayVote}
              duration={generationDurations[index]}
              showVoteControls={!hideVoteControls && allTerminal}
              canStop={isSessionStoppable(sessionState?.status)}
              isStopping={isStopping || isSessionStopping(sessionState?.status)}
              onStop={() => void stopSession(message._id)}
              stopLabel={modelName}
            />
          );
        })}
      </div>

      {renderFooter(false)}

      <ConsolidateDialog
        open={showConsolidateDialog}
        comparisonGroupId={comparisonGroupId}
        messages={sortedMessages}
        onConfirm={(model, mode) => void handleConsolidate(model, mode)}
        onClose={() => setShowConsolidateDialog(false)}
      />
    </div>
  );
}
