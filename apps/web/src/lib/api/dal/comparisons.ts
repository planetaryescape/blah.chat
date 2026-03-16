import { conversations } from "@blah-chat/persistence-postgres";
import { and, eq } from "drizzle-orm";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { toApiMessageWithMeta } from "@/lib/persistence/mappers";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

type VoteRating = "left_better" | "right_better" | "tie" | "both_bad";

async function assertOwnedConsolidatedMessage(
  userId: string,
  messageId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(userId);
  const message = await db.query.messages.findFirst({
    where: (table, { eq }) => eq(table.id, messageId),
  });

  if (!message) {
    throw new Error("Message not found");
  }

  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, message.conversationId),
      eq(conversations.userId, user.id),
    ),
  });

  if (!conversation) {
    throw new Error("Message not found");
  }

  return { user, message };
}

export const comparisonsDAL = {
  async recordVote(
    userId: string,
    input: {
      comparisonGroupId: string;
      winnerMessageId?: string | null;
      rating: VoteRating;
    },
  ) {
    const user = await ensureCurrentPersistenceUser(userId);
    const vote = await getGenerationV2Service().recordVote({
      userId: user.id,
      comparisonGroupId: input.comparisonGroupId,
      winnerMessageId: input.winnerMessageId,
      rating: input.rating,
    });

    return formatEntity(
      {
        comparisonGroupId: vote.comparisonGroupId,
        winnerMessageId: vote.winnerMessageId,
        rating: vote.rating,
        votedAt: vote.votedAt,
      },
      "comparison.vote",
      vote.id,
    );
  },

  async consolidate(
    userId: string,
    input: {
      comparisonGroupId: string;
      consolidationModel: string;
      mode: "same-chat" | "new-chat";
    },
  ) {
    const user = await ensureCurrentPersistenceUser(userId);
    const service = getGenerationV2Service();
    const started =
      input.mode === "same-chat"
        ? await service.startSameChatConsolidation({
            comparisonGroupId: input.comparisonGroupId,
            consolidationModel: input.consolidationModel,
          })
        : await service.startNewConversationConsolidation({
            userId: user.id,
            comparisonGroupId: input.comparisonGroupId,
            consolidationModel: input.consolidationModel,
          });

    return formatEntity(
      {
        mode: input.mode,
        requestId: started.requestId,
        conversationId: started.conversationId,
        messageId: started.assistantMessageIds[0],
        assistantMessageIds: started.assistantMessageIds,
        streamUrl: `/api/v1/generations/${started.requestId}/stream`,
        stopUrl: `/api/v1/generations/${started.requestId}/stop`,
      },
      "generation",
      started.requestId,
    );
  },

  async listOriginalResponses(userId: string, consolidatedMessageId: string) {
    await assertOwnedConsolidatedMessage(userId, consolidatedMessageId);
    const messages = await getGenerationV2Service().getOriginalResponses(
      consolidatedMessageId,
    );

    return formatEntityList(
      messages.map((message) => toApiMessageWithMeta(message)),
      "message",
    );
  },
};
