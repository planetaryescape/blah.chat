import {
  attachments,
  conversations,
  createConversationRepository,
  createSignedReadUrl,
  createTriggerClient,
  messageEdges,
  messages,
} from "@blah-chat/persistence-postgres";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createGenerationV2Repository } from "@/lib/generation-v2/repository";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { toApiMessageWithMeta } from "@/lib/persistence/mappers";
import { getPersistenceDb } from "@/lib/persistence/server";
import {
  getPersistenceEnv,
  getPersistenceR2Client,
} from "@/lib/persistence/storage";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";

const sendMessageSchema = z.object({
  content: z.string().min(1),
  modelId: z.string().optional(),
  models: z.array(z.string()).optional(),
  parentMessageId: z.string().optional(),
  clientMessageId: z.string().optional(),
  thinkingEffort: z.enum(["none", "low", "medium", "high"]).optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["file", "image", "audio"]),
        name: z.string(),
        storageId: z.string(),
        mimeType: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
});

const EXTRACTABLE_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

function isExtractableAttachment(input: {
  type: "file" | "image" | "audio";
  mimeType: string;
}) {
  return (
    input.type === "file" &&
    (EXTRACTABLE_MIME_TYPES.has(input.mimeType) ||
      input.mimeType.startsWith("text/"))
  );
}

async function getOwnedRequestMessage(userId: string, messageId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(userId);

  const conversations = await db.query.conversations.findMany({
    where: (table, { eq }) => eq(table.userId, user.id),
  });
  const conversationIds = new Set(
    conversations.map((conversation) => conversation.id),
  );

  const message = await db.query.messages.findFirst({
    where: (table, { eq }) => eq(table.id, messageId),
  });

  if (!message || !conversationIds.has(message.conversationId)) {
    throw new Error("Message not found");
  }

  return { db, user, message };
}

async function buildMessageTreeMeta(
  userId: string,
  conversationId: string,
  messageIds: string[],
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(userId);
  const conversation = await db.query.conversations.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, conversationId), eq(table.userId, user.id)),
  });

  if (!conversation) {
    throw new Error("Access denied");
  }

  const edges =
    messageIds.length > 0
      ? await db.query.messageEdges.findMany({
          where: inArray(messageEdges.childMessageId, messageIds),
          orderBy: (table, { asc }) => [asc(table.position)],
        })
      : [];

  const parentIdsByChild = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = parentIdsByChild.get(edge.childMessageId) ?? [];
    existing.push(edge.parentMessageId);
    parentIdsByChild.set(edge.childMessageId, existing);
  }

  const activePath =
    await createConversationRepository(db).getActivePath(conversationId);
  const activePathIds = new Set(activePath.map((message) => message.id));

  return {
    conversation,
    parentIdsByChild,
    activePathIds,
  };
}

async function buildAttachmentMeta(messageIds: string[]) {
  if (messageIds.length === 0) {
    return new Map<
      string,
      Array<{
        id: string;
        type: "file" | "image" | "audio";
        storageId: string;
        name: string;
        mimeType: string;
        size: number;
        url?: string;
      }>
    >();
  }

  const db = getPersistenceDb();
  const rows = await db
    .select({
      id: attachments.id,
      messageId: attachments.messageId,
      key: attachments.key,
      name: attachments.name,
      mimeType: attachments.mimeType,
      size: attachments.size,
      type: attachments.type,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(inArray(attachments.messageId, messageIds))
    .orderBy(asc(attachments.createdAt));
  if (rows.length === 0) {
    return new Map<
      string,
      Array<{
        id: string;
        type: "file" | "image" | "audio";
        storageId: string;
        name: string;
        mimeType: string;
        size: number;
        url?: string;
      }>
    >();
  }

  const env = getPersistenceEnv();
  const client = getPersistenceR2Client();
  const signed = await Promise.all(
    rows.map(async (attachment) => ({
      messageId: attachment.messageId,
      data: {
        id: attachment.id,
        type: attachment.type as "file" | "image" | "audio",
        storageId: attachment.key,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: await createSignedReadUrl({
          client,
          bucket: env.r2.bucket,
          key: attachment.key,
        }),
      },
    })),
  );

  const byMessage = new Map<string, Array<(typeof signed)[number]["data"]>>();
  for (const attachment of signed) {
    const existing = byMessage.get(attachment.messageId) ?? [];
    existing.push(attachment.data);
    byMessage.set(attachment.messageId, existing);
  }

  return byMessage;
}

function assertOwnedAttachmentKeys(
  userId: string,
  conversationId: string,
  uploadedAttachments: NonNullable<
    z.infer<typeof sendMessageSchema>["attachments"]
  >,
) {
  const prefix = `users/${userId}/conversations/${conversationId}/`;
  for (const attachment of uploadedAttachments) {
    if (!attachment.storageId.startsWith(prefix)) {
      throw new Error("Invalid attachment");
    }
  }
}

export const messagesDAL = {
  send: async (
    userId: string,
    conversationId: string,
    data: z.infer<typeof sendMessageSchema>,
  ) => {
    const validated = sendMessageSchema.parse(data);
    const user = await ensureCurrentPersistenceUser(userId);
    if (validated.attachments?.length) {
      assertOwnedAttachmentKeys(user.id, conversationId, validated.attachments);
    }
    const service = getGenerationV2Service();
    const started = await service.start({
      clerkUser: {
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl ?? undefined,
      },
      conversationId,
      content: validated.content,
      clientMessageId: validated.clientMessageId,
      modelId: validated.modelId,
      models: validated.models,
      parentMessageId: validated.parentMessageId,
    });
    const db = getPersistenceDb();
    const env = getPersistenceEnv();
    if (validated.attachments && validated.attachments.length > 0) {
      const insertedAttachments = await db
        .insert(attachments)
        .values(
          validated.attachments.map((attachment) => ({
            messageId: started.userMessageId,
            conversationId,
            userId: user.id,
            type: attachment.type,
            key: attachment.storageId,
            bucket: env.r2.bucket,
            name: attachment.name,
            mimeType: attachment.mimeType,
            size: attachment.size,
            createdAt: Date.now(),
          })),
        )
        .returning();

      const extractableAttachments = insertedAttachments.filter((attachment) =>
        isExtractableAttachment({
          type: attachment.type as "file" | "image" | "audio",
          mimeType: attachment.mimeType,
        }),
      );

      if (extractableAttachments.length > 0) {
        const trigger = createTriggerClient(env);
        await Promise.all(
          extractableAttachments.map((attachment) =>
            trigger.triggerTask("extract-text", {
              attachmentId: attachment.id,
              storageId: attachment.key,
              fileName: attachment.name,
              mimeType: attachment.mimeType,
            }),
          ),
        );
      }
    }

    return {
      status: "success" as const,
      sys: {
        entity: "message",
        async: true,
      },
      data: {
        requestId: started.requestId,
        conversationId,
        messageId: started.userMessageId,
        assistantMessageId: started.assistantMessageIds[0],
        assistantMessageIds: started.assistantMessageIds,
        assistantModelId: started.modelIds[0],
        modelIds: started.modelIds,
        status: "pending" as const,
        pollUrl: `/api/v1/messages/${started.assistantMessageIds[0]}`,
        streamUrl: `/api/v1/generations/${started.requestId}/stream`,
        stopUrl: `/api/v1/generations/${started.requestId}/stop`,
      },
    };
  },

  get: async (userId: string, messageId: string) => {
    const { message } = await getOwnedRequestMessage(userId, messageId);
    const attachmentMeta = await buildAttachmentMeta([message.id]);
    const meta = await buildMessageTreeMeta(userId, message.conversationId, [
      message.id,
    ]);
    const parentMessageIds = meta.parentIdsByChild.get(message.id) ?? [];
    return formatEntity(
      toApiMessageWithMeta(message, {
        parentMessageId: parentMessageIds[0],
        parentMessageIds,
        isActiveBranch: meta.activePathIds.has(message.id),
        attachments: attachmentMeta.get(message.id),
      }),
      "message",
      message.id,
    );
  },

  list: async (userId: string, conversationId: string) => {
    const db = getPersistenceDb();
    const repo = createGenerationV2Repository(db);
    const messages = await repo.listMessages(conversationId);
    const messageIds = messages.map((message) => message.id);
    const attachmentMeta = await buildAttachmentMeta(messageIds);
    const fullMeta = await buildMessageTreeMeta(
      userId,
      conversationId,
      messageIds,
    );

    return messages.map((message) =>
      formatEntity(
        toApiMessageWithMeta(message, {
          parentMessageId: fullMeta.parentIdsByChild.get(message.id)?.[0],
          parentMessageIds: fullMeta.parentIdsByChild.get(message.id) ?? [],
          isActiveBranch: fullMeta.activePathIds.has(message.id),
          attachments: attachmentMeta.get(message.id),
        }),
        "message",
        message.id,
      ),
    );
  },

  update: async (
    userId: string,
    messageId: string,
    content: string,
    options?: {
      modelId?: string;
    },
  ) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error("Message content cannot be empty");
    }

    const { db, message } = await getOwnedRequestMessage(userId, messageId);
    if (message.role !== "user") {
      throw new Error("Can only edit user messages");
    }

    const repo = createGenerationV2Repository(db);
    const started = await repo.createEditRequest({
      messageId: message.id,
      content: trimmedContent,
      modelId: options?.modelId,
    });

    return {
      status: "success" as const,
      sys: {
        entity: "message",
        async: true,
      },
      data: {
        requestId: started.requestId,
        conversationId: started.conversationId,
        messageId: started.userMessageId,
        assistantMessageId: started.assistantMessageIds[0],
        assistantMessageIds: started.assistantMessageIds,
        status: "pending" as const,
        pollUrl: `/api/v1/messages/${started.assistantMessageIds[0]}`,
        streamUrl: `/api/v1/generations/${started.requestId}/stream`,
        stopUrl: `/api/v1/generations/${started.requestId}/stop`,
      },
    };
  },

  regenerate: async (userId: string, messageId: string, modelId?: string) => {
    const { db, message } = await getOwnedRequestMessage(userId, messageId);
    const repo = createGenerationV2Repository(db);
    const started = await repo.createRegenerationRequest({
      assistantMessageId: message.id,
      modelId,
    });

    // Record routing feedback: user was unhappy with original response
    repo.recordRegenerationFeedback(message.id).catch(() => {
      // Non-critical: don't block regeneration if feedback recording fails
    });

    return {
      status: "success" as const,
      sys: {
        entity: "message",
        async: true,
      },
      data: {
        requestId: started.requestId,
        conversationId: started.conversationId,
        messageId: started.userMessageId,
        assistantMessageId: started.assistantMessageIds[0],
        assistantMessageIds: started.assistantMessageIds,
        status: "pending" as const,
        pollUrl: `/api/v1/messages/${started.assistantMessageIds[0]}`,
        streamUrl: `/api/v1/generations/${started.requestId}/stream`,
        stopUrl: `/api/v1/generations/${started.requestId}/stop`,
      },
    };
  },

  delete: async (userId: string, messageId: string) => {
    const { db, message } = await getOwnedRequestMessage(userId, messageId);
    const messagesToDelete = new Set<string>([message.id]);
    const queue = [message.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const childEdges = await db.query.messageEdges.findMany({
        where: eq(messageEdges.parentMessageId, currentId),
      });

      for (const edge of childEdges) {
        if (!messagesToDelete.has(edge.childMessageId)) {
          messagesToDelete.add(edge.childMessageId);
          queue.push(edge.childMessageId);
        }
      }
    }

    const parentEdge = await db.query.messageEdges.findFirst({
      where: eq(messageEdges.childMessageId, message.id),
      orderBy: (table, { asc }) => [asc(table.position)],
      columns: {
        parentMessageId: true,
      },
    });

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, message.conversationId),
    });

    await db
      .delete(messages)
      .where(inArray(messages.id, [...messagesToDelete]));

    if (
      conversation?.activeLeafMessageId &&
      messagesToDelete.has(conversation.activeLeafMessageId)
    ) {
      await createConversationRepository(db).setActiveLeaf({
        conversationId: message.conversationId,
        activeLeafMessageId: parentEdge?.parentMessageId ?? null,
      });
    }

    return formatEntity({ deleted: true, messageId }, "message", messageId);
  },
};
