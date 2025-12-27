"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface UseChatComparisonOptions {
  conversationId: Id<"conversations"> | undefined;
  messages: any[] | undefined;
}

export function useChatComparison({
  conversationId,
  messages,
}: UseChatComparisonOptions) {
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
    async (model: string, mode: "same-chat" | "new-chat") => {
      const msg = messages?.find((m) => m.comparisonGroupId);
      if (!msg?.comparisonGroupId || !conversationId) return;

      if (mode === "same-chat") {
        // Consolidate in place - no navigation
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
      messages,
      conversationId,
      consolidateInPlace,
      updateModelMutation,
      createConsolidation,
      router,
    ],
  );

  return {
    handleVote,
    handleConsolidate,
  };
}
