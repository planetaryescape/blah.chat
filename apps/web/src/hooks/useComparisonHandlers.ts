"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { OptimisticMessage } from "@/types/optimistic";

type ServerMessage = Doc<"messages">;
type MessageWithOptimistic = ServerMessage | OptimisticMessage;
type ConsolidationMode = "same-chat" | "new-chat";

interface UseComparisonHandlersOptions {
  conversationId: Id<"conversations"> | undefined;
  messages: MessageWithOptimistic[] | undefined;
}

interface UseComparisonHandlersReturn {
  handleVote: (winnerId: string, rating: string) => Promise<void>;
  handleConsolidate: (model: string, mode: ConsolidationMode) => Promise<void>;
}

/**
 * Handles voting and consolidation actions for comparison mode.
 */
export function useComparisonHandlers({
  conversationId,
  messages,
}: UseComparisonHandlersOptions): UseComparisonHandlersReturn {
  const router = useRouter();

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const recordVote = useMutation(api.votes.recordVote);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createConsolidation = useMutation(
    api.conversations.createConsolidationConversation,
  );
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const consolidateInPlace = useMutation(
    api.conversations.consolidateInSameChat,
  );
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateModelMutation = useMutation(api.conversations.updateModel);

  const handleVote = useCallback(
    async (winnerId: string, rating: string) => {
      // Only handle votes for server-confirmed messages (not optimistic)
      const msg = messages?.find(
        (m) => !("_optimistic" in m) && m._id === winnerId,
      );
      if (msg?.comparisonGroupId) {
        const voteRating = rating as
          | "left_better"
          | "right_better"
          | "tie"
          | "both_bad";
        await recordVote({
          comparisonGroupId: msg.comparisonGroupId,
          winnerId: msg._id as Id<"messages">,
          rating: voteRating,
        });
      }
    },
    [messages, recordVote],
  );

  const handleConsolidate = useCallback(
    async (model: string, mode: ConsolidationMode) => {
      const msg = messages?.find((m) => m.comparisonGroupId);
      if (!msg?.comparisonGroupId) return;

      if (mode === "same-chat") {
        // Consolidate in place - no navigation
        if (!conversationId) return;
        await consolidateInPlace({
          conversationId,
          comparisonGroupId: msg.comparisonGroupId,
          consolidationModel: model,
        });

        // Update conversation model to match consolidation choice
        await updateModelMutation({
          conversationId,
          model: model,
        });
      } else {
        // Create new conversation and navigate
        const { conversationId: newConvId } = await createConsolidation({
          comparisonGroupId: msg.comparisonGroupId,
          consolidationModel: model,
        });
        router.push(`/chat/${newConvId}`);
      }
    },
    [
      conversationId,
      messages,
      consolidateInPlace,
      createConsolidation,
      updateModelMutation,
      router,
    ],
  );

  return {
    handleVote,
    handleConsolidate,
  };
}
