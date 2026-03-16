import {
  conversations,
  createConversationRepository,
  messageEdges,
  messages,
} from "@blah-chat/persistence-postgres";
import { eq, inArray } from "drizzle-orm";
import { createGenerationV2Repository } from "@/lib/generation-v2/repository";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { toApiMessageWithMeta } from "@/lib/persistence/mappers";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().min(1),
  modelId: z.string().optional(),
  models: z.array(z.string()).optional(),
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

export const messagesDAL = {
  send: async (
    userId: string,
    conversationId: string,
    data: z.infer<typeof sendMessageSchema>,
    _sessionToken: string,
  ) => {
    const validated = sendMessageSchema.parse(data);
    const user = await ensureCurrentPersistenceUser(userId);
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
      modelId: validated.modelId,
      models: validated.models,
    });

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
        status: "pending" as const,
        pollUrl: `/api/v1/messages/${started.assistantMessageIds[0]}`,
        streamUrl: `/api/v1/generations/${started.requestId}/stream`,
        stopUrl: `/api/v1/generations/${started.requestId}/stop`,
      },
    };
  },

  get: async (userId: string, messageId: string) => {
    const { message } = await getOwnedRequestMessage(userId, messageId);
    const meta = await buildMessageTreeMeta(userId, message.conversationId, [
      message.id,
    ]);
    const parentMessageIds = meta.parentIdsByChild.get(message.id) ?? [];
    return formatEntity(
      toApiMessageWithMeta(message, {
        parentMessageId: parentMessageIds[0],
        parentMessageIds,
        isActiveBranch: meta.activePathIds.has(message.id),
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
      createBranch?: boolean;
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

    const shouldCreateBranch = options?.createBranch !== false;
    if (!shouldCreateBranch) {
      await db
        .update(messages)
        .set({
          content: trimmedContent,
          updatedAt: Date.now(),
        })
        .where(eq(messages.id, message.id));

      return formatEntity(
        toApiMessageWithMeta({
          ...message,
          content: trimmedContent,
          updatedAt: Date.now(),
        }),
        "message",
        message.id,
      );
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
