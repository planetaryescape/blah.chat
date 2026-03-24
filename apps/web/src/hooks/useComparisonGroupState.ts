"use client";

import { useQuery as useRestQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useApiClient } from "@/lib/api/client";

type LatestVote = {
  outcome: "winner" | "tie" | "both_bad";
  winnerMessageId?: string | null;
  votedAt: number;
} | null;

type SessionState = {
  sessionId?: string | null;
  modelId?: string | null;
  status: string;
};

type AssistantMessageState = {
  content?: string;
  status: string;
  model?: string | null;
};

export type ComparisonGroupState = {
  comparisonGroupId: string;
  conversationId: string;
  userMessageId: string;
  status: string;
  requestId?: string | null;
  assistantMessagesById: Record<string, AssistantMessageState>;
  sessionsByMessageId: Record<string, SessionState>;
  latestVote?: LatestVote;
};

function isTerminalComparisonStatus(status?: string) {
  return ["complete", "cancelled", "stopped", "error"].includes(status ?? "");
}

function needsAssistantRefresh(data?: ComparisonGroupState) {
  if (!data) {
    return false;
  }

  const sessionsByMessageId = data.sessionsByMessageId ?? {};
  const assistantMessagesById = data.assistantMessagesById ?? {};

  return Object.entries(sessionsByMessageId).some(([messageId, session]) => {
    const assistant = assistantMessagesById[messageId];
    const assistantStatus = assistant?.status;

    if (
      !isTerminalComparisonStatus(session.status) ||
      !isTerminalComparisonStatus(assistantStatus)
    ) {
      return true;
    }

    if (
      (session.status === "complete" || assistantStatus === "complete") &&
      !assistant?.content
    ) {
      return true;
    }

    return false;
  });
}

export function shouldPollComparisonGroup(data?: ComparisonGroupState) {
  return !!data?.requestId || needsAssistantRefresh(data);
}

function removeSessionId(sessionIds: string[], sessionId: string) {
  return sessionIds.filter((value) => value !== sessionId);
}

export function useComparisonGroupState(comparisonGroupId?: string) {
  const apiClient = useApiClient();
  const [isStoppingGroup, setIsStoppingGroup] = useState(false);
  const [stoppingSessionIds, setStoppingSessionIds] = useState<string[]>([]);

  const query = useRestQuery({
    queryKey: ["comparison-group", comparisonGroupId],
    queryFn: async () =>
      apiClient.get<ComparisonGroupState>(
        `/api/v1/comparisons/${comparisonGroupId}`,
      ),
    enabled: !!comparisonGroupId,
    staleTime: 5_000,
    refetchInterval: (queryState) => {
      const data = queryState.state.data as ComparisonGroupState | undefined;
      return shouldPollComparisonGroup(data) ? 1_500 : false;
    },
  });

  const comparisonGroup = query.data ?? null;

  const stopGroup = useCallback(async () => {
    if (!comparisonGroup?.requestId) {
      return;
    }

    setIsStoppingGroup(true);
    try {
      await apiClient.post(
        `/api/v1/generations/${comparisonGroup.requestId}/stop`,
      );
      await query.refetch();
    } finally {
      setIsStoppingGroup(false);
    }
  }, [apiClient, comparisonGroup?.requestId, query]);

  const stopSession = useCallback(
    async (assistantMessageId: string) => {
      const session = comparisonGroup?.sessionsByMessageId[assistantMessageId];
      if (!comparisonGroup?.requestId || !session?.sessionId) {
        return;
      }

      setStoppingSessionIds((current) => [...current, session.sessionId!]);
      try {
        await apiClient.post(
          `/api/v1/generations/${comparisonGroup.requestId}/sessions/${session.sessionId}/stop`,
        );
        await query.refetch();
      } finally {
        setStoppingSessionIds((current) =>
          removeSessionId(current, session.sessionId!),
        );
      }
    },
    [apiClient, comparisonGroup, query],
  );

  return useMemo(
    () => ({
      comparisonGroup,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isStoppingGroup,
      stoppingSessionIds,
      refetch: query.refetch,
      stopGroup,
      stopSession,
    }),
    [
      comparisonGroup,
      isStoppingGroup,
      query.isFetching,
      query.isLoading,
      query.refetch,
      stopGroup,
      stopSession,
      stoppingSessionIds,
    ],
  );
}
