import { conversations } from "@blah-chat/persistence-postgres";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { assertGenerationAllowed } from "@/lib/api/dal/generationPolicy";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import { ensurePersistenceUserFromIdentity } from "@/lib/persistence/current-user";
import { toApiMessageWithMeta } from "@/lib/persistence/mappers";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

export const cliSendMessageSchema = z.object({
  content: z.string().min(1).max(64_000),
  modelId: z.string().optional(),
});

type CliIdentity = {
  clerkId: string;
  email: string;
  name: string;
};

async function getOwnedConversation(
  identity: CliIdentity,
  conversationId: string,
) {
  const db = getPersistenceDb();
  const user = await ensurePersistenceUserFromIdentity(identity);
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.userId, user.id),
    ),
  });

  if (!conversation) {
    return null;
  }

  return {
    db,
    user,
    conversation,
  };
}

export const cliChatDAL = {
  async listMessages(identity: CliIdentity, conversationId: string) {
    const ownedConversation = await getOwnedConversation(
      identity,
      conversationId,
    );
    if (!ownedConversation) {
      return null;
    }

    const repo = getGenerationV2Service().repository;
    const messages = await repo.listMessages(conversationId);

    return formatEntityList(
      messages.map((message) => toApiMessageWithMeta(message)),
      "message",
    );
  },

  async sendMessage(
    identity: CliIdentity,
    conversationId: string,
    payload: z.infer<typeof cliSendMessageSchema>,
  ) {
    const ownedConversation = await getOwnedConversation(
      identity,
      conversationId,
    );
    if (!ownedConversation) {
      throw new Error("Conversation not found");
    }

    const validated = cliSendMessageSchema.parse(payload);
    await assertGenerationAllowed({
      db: ownedConversation.db,
      userId: ownedConversation.user.id,
      requestedModelIds: [
        validated.modelId ?? ownedConversation.conversation.model,
      ],
      source: "send",
    });
    const service = getGenerationV2Service();
    const started = await service.start({
      clerkUser: identity,
      conversationId,
      content: validated.content,
      modelId: validated.modelId,
    });

    return formatEntity(
      {
        requestId: started.requestId,
        conversationId: started.conversationId,
        userMessageId: started.userMessageId,
        assistantMessageIds: started.assistantMessageIds,
        modelIds: started.modelIds,
        streamUrl: `/api/v1/cli/generations/${started.requestId}/stream`,
        stopUrl: `/api/v1/generations/${started.requestId}/stop`,
        status: "pending",
      },
      "generationRequest",
      started.requestId,
    );
  },

  async getActiveGeneration(identity: CliIdentity, conversationId: string) {
    const ownedConversation = await getOwnedConversation(
      identity,
      conversationId,
    );
    if (!ownedConversation) {
      return null;
    }

    const activeRequest =
      await getGenerationV2Service().repository.findLatestActiveRequestForConversation(
        conversationId,
        identity.clerkId,
      );

    return formatEntity(
      {
        conversationId,
        requestId: activeRequest?.id ?? null,
        streamUrl: activeRequest
          ? `/api/v1/cli/generations/${activeRequest.id}/stream`
          : null,
        status: activeRequest?.status ?? null,
      },
      "generation",
      activeRequest?.id ?? conversationId,
    );
  },

  async getOwnedRequestBundle(identity: CliIdentity, requestId: string) {
    return getGenerationV2Service().repository.getRequestBundle(
      requestId,
      identity.clerkId,
    );
  },
};
