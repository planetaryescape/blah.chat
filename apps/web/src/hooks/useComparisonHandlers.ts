"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useApiClient } from "@/lib/api/client";

type VoteOutcome = "winner" | "tie" | "both_bad";
type ConsolidationMode = "same-chat" | "new-chat";

interface ComparisonMessage {
  _id: string;
  role: "user" | "assistant" | "system";
  comparisonGroupId?: string;
  _optimistic?: boolean;
}

interface UseComparisonHandlersOptions {
  conversationId: string | undefined;
  messages: ComparisonMessage[] | undefined;
}

interface UseComparisonHandlersReturn {
  handleVote: (
    winnerId: string | undefined,
    outcome: VoteOutcome,
  ) => Promise<void>;
  handleConsolidate: (model: string, mode: ConsolidationMode) => Promise<void>;
}

export function useComparisonHandlers({
  conversationId: _conversationId,
  messages,
}: UseComparisonHandlersOptions): UseComparisonHandlersReturn {
  const router = useRouter();
  const apiClient = useApiClient();

  const handleVote = useCallback(
    async (winnerId: string | undefined, outcome: VoteOutcome) => {
      const msg =
        messages?.find(
          (message) => !message._optimistic && message._id === winnerId,
        ) ?? messages?.find((message) => !!message.comparisonGroupId);

      if (!msg?.comparisonGroupId) {
        return;
      }

      await apiClient.post(
        `/api/v1/comparisons/${msg.comparisonGroupId}/vote`,
        {
          winnerMessageId: winnerId,
          outcome,
        },
      );
    },
    [apiClient, messages],
  );

  const handleConsolidate = useCallback(
    async (model: string, mode: ConsolidationMode) => {
      const msg = messages?.find((message) => message.comparisonGroupId);
      if (!msg?.comparisonGroupId) {
        return;
      }

      const result = await apiClient.post<{
        conversationId: string;
      }>(`/api/v1/comparisons/${msg.comparisonGroupId}/consolidate`, {
        consolidationModel: model,
        mode,
      });

      if (mode === "new-chat") {
        router.push(`/chat/${result.conversationId}`);
      }
    },
    [apiClient, messages, router],
  );

  return {
    handleVote,
    handleConsolidate,
  };
}
