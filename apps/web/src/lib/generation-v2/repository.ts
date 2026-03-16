import {
  conversations,
  generationCheckpoints,
  generationRequests,
  generationSessions,
  type Message,
  messageEdges,
  messages,
  type PersistenceDb,
  users,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  ClerkUserProfile,
  PersistedRequestBundle,
  StartedGeneration,
  StartGenerationInput,
} from "./types";

const now = () => Date.now();

function dedupeModels(modelId?: string, models?: string[]) {
  const explicit = modelId ? [modelId] : [];
  const resolved = [...explicit, ...(models ?? [])].filter(Boolean);
  return [...new Set(resolved)];
}

async function getParentIds(db: PersistenceDb, messageId: string) {
  const parentEdges = await db.query.messageEdges.findMany({
    where: eq(messageEdges.childMessageId, messageId),
    orderBy: (table, { asc: orderAsc }) => [orderAsc(table.position)],
  });

  return parentEdges.map((edge) => edge.parentMessageId);
}

async function getNextSiblingIndex(input: {
  db: PersistenceDb;
  conversationId: string;
  parentIds: string[];
}) {
  const { db, conversationId, parentIds } = input;

  if (parentIds.length > 0) {
    const siblingRows = await db
      .select({ siblingIndex: messages.siblingIndex })
      .from(messages)
      .innerJoin(messageEdges, eq(messageEdges.childMessageId, messages.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messageEdges.parentMessageId, parentIds[0]!),
        ),
      );

    return (
      siblingRows.reduce(
        (max, row) => Math.max(max, row.siblingIndex ?? 0),
        -1,
      ) + 1
    );
  }

  const conversationMessages = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
  });

  if (conversationMessages.length === 0) {
    return 0;
  }

  const edges = await db.query.messageEdges.findMany({
    where: inArray(
      messageEdges.childMessageId,
      conversationMessages.map((message) => message.id),
    ),
  });
  const childIds = new Set(edges.map((edge) => edge.childMessageId));
  const rootSiblings = conversationMessages.filter(
    (message) => !childIds.has(message.id),
  );

  return (
    rootSiblings.reduce(
      (max, message) => Math.max(max, message.siblingIndex ?? 0),
      -1,
    ) + 1
  );
}

export function createGenerationV2Repository(db: PersistenceDb) {
  return {
    async upsertUser(clerkUser: ClerkUserProfile) {
      const existing = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkUser.clerkId),
      });

      if (existing) {
        const [updated] = await db
          .update(users)
          .set({
            email: clerkUser.email,
            name: clerkUser.name,
            imageUrl: clerkUser.imageUrl,
            updatedAt: now(),
          })
          .where(eq(users.id, existing.id))
          .returning();

        if (!updated) {
          throw new Error("Failed to update user");
        }

        return updated;
      }

      const [created] = await db
        .insert(users)
        .values({
          clerkId: clerkUser.clerkId,
          email: clerkUser.email,
          name: clerkUser.name,
          imageUrl: clerkUser.imageUrl,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create user");
      }

      return created;
    },

    async createRequest(
      input: StartGenerationInput,
    ): Promise<StartedGeneration> {
      const modelIds = dedupeModels(input.modelId, input.models);
      if (modelIds.length === 0) {
        throw new Error("At least one model is required");
      }

      const user = await this.upsertUser(input.clerkUser);
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.userId, user.id),
        ),
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const comparisonGroupId = modelIds.length > 1 ? nanoid() : null;
      const parentIds = conversation.activeLeafMessageId
        ? [conversation.activeLeafMessageId]
        : [];
      const parentMessage = parentIds[0]
        ? await db.query.messages.findFirst({
            where: and(
              eq(messages.id, parentIds[0]),
              eq(messages.conversationId, conversation.id),
            ),
          })
        : null;

      const userMessageId = nanoid();
      const [userMessage] = await db
        .insert(messages)
        .values({
          id: userMessageId,
          conversationId: conversation.id,
          userId: user.id,
          role: "user",
          content: input.content,
          status: "complete",
          rootMessageId:
            parentMessage?.rootMessageId ?? parentMessage?.id ?? userMessageId,
          siblingIndex: 0,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!userMessage) {
        throw new Error("Failed to create user message");
      }

      if (parentIds.length > 0) {
        await db.insert(messageEdges).values(
          parentIds.map((parentMessageId, index) => ({
            parentMessageId,
            childMessageId: userMessage.id,
            position: index,
            edgeType: "reply",
            createdAt: now(),
          })),
        );
      }

      const [request] = await db
        .insert(generationRequests)
        .values({
          conversationId: conversation.id,
          userMessageId: userMessage.id,
          requestedModels: modelIds,
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create generation request");
      }

      const assistantRows = await Promise.all(
        modelIds.map(async (modelId, index) => {
          const assistantMessageId = nanoid();
          const [assistantMessage] = await db
            .insert(messages)
            .values({
              id: assistantMessageId,
              conversationId: conversation.id,
              role: "assistant",
              content: "",
              status: "pending",
              model: modelId,
              comparisonGroupId,
              rootMessageId: userMessage.rootMessageId ?? userMessage.id,
              siblingIndex: index,
              createdAt: now(),
              updatedAt: now(),
            })
            .returning();

          if (!assistantMessage) {
            throw new Error("Failed to create assistant message");
          }

          await db.insert(messageEdges).values({
            parentMessageId: userMessage.id,
            childMessageId: assistantMessage.id,
            position: 0,
            edgeType: "reply",
            createdAt: now(),
          });

          const [session] = await db
            .insert(generationSessions)
            .values({
              requestId: request.id,
              assistantMessageId: assistantMessage.id,
              modelId,
              status: "pending",
              provider: null,
              createdAt: now(),
              updatedAt: now(),
            })
            .returning();

          if (!session) {
            throw new Error("Failed to create generation session");
          }

          return { assistantMessage, session };
        }),
      );

      await db
        .update(conversations)
        .set({
          activeLeafMessageId: assistantRows[0]?.assistantMessage.id ?? null,
          updatedAt: now(),
        })
        .where(eq(conversations.id, conversation.id));

      return {
        requestId: request.id,
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        assistantMessageIds: assistantRows.map(
          (row) => row.assistantMessage.id,
        ),
        modelIds,
      };
    },

    async createRegenerationRequest(input: {
      assistantMessageId: string;
      modelId?: string;
    }): Promise<StartedGeneration> {
      const assistantMessage = await db.query.messages.findFirst({
        where: eq(messages.id, input.assistantMessageId),
      });

      if (!assistantMessage || assistantMessage.role !== "assistant") {
        throw new Error("Can only regenerate assistant messages");
      }

      const parentEdge = await db.query.messageEdges.findFirst({
        where: eq(messageEdges.childMessageId, assistantMessage.id),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.position)],
      });

      if (!parentEdge) {
        throw new Error("Assistant message has no parent");
      }

      const userMessage = await db.query.messages.findFirst({
        where: eq(messages.id, parentEdge.parentMessageId),
      });

      if (!userMessage || userMessage.role !== "user") {
        throw new Error("Assistant message parent must be a user message");
      }

      const resolvedModel = input.modelId ?? assistantMessage.model;
      if (!resolvedModel) {
        throw new Error("No model available for regeneration");
      }

      const siblingRows = await db
        .select({ siblingIndex: messages.siblingIndex })
        .from(messages)
        .innerJoin(messageEdges, eq(messageEdges.childMessageId, messages.id))
        .where(eq(messageEdges.parentMessageId, userMessage.id));

      const nextSiblingIndex =
        siblingRows.reduce(
          (max, row) => Math.max(max, row.siblingIndex ?? 0),
          -1,
        ) + 1;

      const [request] = await db
        .insert(generationRequests)
        .values({
          conversationId: assistantMessage.conversationId,
          userMessageId: userMessage.id,
          requestedModels: [resolvedModel],
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create regeneration request");
      }

      const assistantMessageId = nanoid();
      const [regeneratedAssistant] = await db
        .insert(messages)
        .values({
          id: assistantMessageId,
          conversationId: assistantMessage.conversationId,
          role: "assistant",
          content: "",
          status: "pending",
          model: resolvedModel,
          rootMessageId: userMessage.rootMessageId ?? userMessage.id,
          siblingIndex: nextSiblingIndex,
          forkReason: "regenerate",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!regeneratedAssistant) {
        throw new Error("Failed to create regenerated assistant message");
      }

      await db.insert(messageEdges).values({
        parentMessageId: userMessage.id,
        childMessageId: regeneratedAssistant.id,
        position: 0,
        edgeType: "reply",
        createdAt: now(),
      });

      const [session] = await db
        .insert(generationSessions)
        .values({
          requestId: request.id,
          assistantMessageId: regeneratedAssistant.id,
          modelId: resolvedModel,
          status: "pending",
          provider: null,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!session) {
        throw new Error("Failed to create regeneration session");
      }

      await db
        .update(conversations)
        .set({
          activeLeafMessageId: regeneratedAssistant.id,
          updatedAt: now(),
        })
        .where(eq(conversations.id, assistantMessage.conversationId));

      return {
        requestId: request.id,
        conversationId: assistantMessage.conversationId,
        userMessageId: userMessage.id,
        assistantMessageIds: [regeneratedAssistant.id],
        modelIds: [resolvedModel],
      };
    },

    async createEditRequest(input: {
      messageId: string;
      content: string;
      modelId?: string;
    }): Promise<StartedGeneration> {
      const originalMessage = await db.query.messages.findFirst({
        where: eq(messages.id, input.messageId),
      });

      if (!originalMessage || originalMessage.role !== "user") {
        throw new Error("Can only edit user messages");
      }

      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, originalMessage.conversationId),
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const parentIds = await getParentIds(db, originalMessage.id);
      const siblingIndex = await getNextSiblingIndex({
        db,
        conversationId: originalMessage.conversationId,
        parentIds,
      });
      const resolvedModel = input.modelId ?? conversation.model;
      if (!resolvedModel) {
        throw new Error("No model available for edited branch");
      }

      const editedMessageId = nanoid();
      const [editedUserMessage] = await db
        .insert(messages)
        .values({
          id: editedMessageId,
          conversationId: originalMessage.conversationId,
          userId: originalMessage.userId,
          role: "user",
          content: input.content,
          status: "complete",
          rootMessageId: originalMessage.rootMessageId ?? originalMessage.id,
          siblingIndex,
          forkReason: "edit",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!editedUserMessage) {
        throw new Error("Failed to create edited user message");
      }

      if (parentIds.length > 0) {
        await db.insert(messageEdges).values(
          parentIds.map((parentMessageId, index) => ({
            parentMessageId,
            childMessageId: editedUserMessage.id,
            position: index,
            edgeType: "reply",
            createdAt: now(),
          })),
        );
      }

      const [request] = await db
        .insert(generationRequests)
        .values({
          conversationId: originalMessage.conversationId,
          userMessageId: editedUserMessage.id,
          requestedModels: [resolvedModel],
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create edit request");
      }

      const assistantMessageId = nanoid();
      const [assistantMessage] = await db
        .insert(messages)
        .values({
          id: assistantMessageId,
          conversationId: originalMessage.conversationId,
          role: "assistant",
          content: "",
          status: "pending",
          model: resolvedModel,
          rootMessageId:
            editedUserMessage.rootMessageId ?? editedUserMessage.id,
          siblingIndex: 0,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!assistantMessage) {
        throw new Error("Failed to create edited assistant message");
      }

      await db.insert(messageEdges).values({
        parentMessageId: editedUserMessage.id,
        childMessageId: assistantMessage.id,
        position: 0,
        edgeType: "reply",
        createdAt: now(),
      });

      const [session] = await db
        .insert(generationSessions)
        .values({
          requestId: request.id,
          assistantMessageId: assistantMessage.id,
          modelId: resolvedModel,
          status: "pending",
          provider: null,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!session) {
        throw new Error("Failed to create edited generation session");
      }

      await db
        .update(conversations)
        .set({
          activeLeafMessageId: assistantMessage.id,
          updatedAt: now(),
        })
        .where(eq(conversations.id, originalMessage.conversationId));

      return {
        requestId: request.id,
        conversationId: originalMessage.conversationId,
        userMessageId: editedUserMessage.id,
        assistantMessageIds: [assistantMessage.id],
        modelIds: [resolvedModel],
      };
    },

    async getRequestBundle(
      requestId: string,
      clerkId?: string,
    ): Promise<PersistedRequestBundle | null> {
      const request = await db.query.generationRequests.findFirst({
        where: eq(generationRequests.id, requestId),
      });

      if (!request) {
        return null;
      }

      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, request.conversationId),
      });
      if (!conversation) {
        return null;
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, conversation.userId),
      });
      if (!user) {
        return null;
      }

      if (clerkId && user.clerkId !== clerkId) {
        return null;
      }

      const sessions = await db.query.generationSessions.findMany({
        where: eq(generationSessions.requestId, request.id),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.createdAt)],
      });

      const promptMessages = await this.getPathToMessage(
        conversation.id,
        request.userMessageId,
      );

      return {
        requestId: request.id,
        conversationId: conversation.id,
        userId: user.id,
        userMessageId: request.userMessageId,
        promptMessages,
        sessions: sessions.map((session) => ({
          sessionId: session.id,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
          provider: session.provider,
          status: session.status,
        })),
      };
    },

    async getPathToMessage(
      conversationId: string,
      messageId: string,
    ): Promise<Message[]> {
      const path: Message[] = [];
      let currentId: string | null = messageId;

      while (currentId) {
        const current: Message | undefined = await db.query.messages.findFirst({
          where: and(
            eq(messages.id, currentId),
            eq(messages.conversationId, conversationId),
          ),
        });

        if (!current) {
          break;
        }

        path.unshift(current);

        const parent:
          | {
              parentMessageId: string;
            }
          | undefined = await db.query.messageEdges.findFirst({
          where: eq(messageEdges.childMessageId, current.id),
          orderBy: (table, { asc: orderAsc }) => [orderAsc(table.position)],
          columns: {
            parentMessageId: true,
          },
        });

        currentId = parent?.parentMessageId ?? null;
      }

      return path;
    },

    async updateRequestStatus(requestId: string, status: string) {
      await db
        .update(generationRequests)
        .set({ status, updatedAt: now() })
        .where(eq(generationRequests.id, requestId));
    },

    async updateSessionStatus(
      sessionId: string,
      status: string,
      provider?: string,
    ) {
      await db
        .update(generationSessions)
        .set({
          status,
          ...(provider !== undefined ? { provider } : {}),
          updatedAt: now(),
        })
        .where(eq(generationSessions.id, sessionId));
    },

    async updateAssistantMessage(input: {
      assistantMessageId: string;
      content: string;
      status: string;
    }) {
      await db
        .update(messages)
        .set({
          content: input.content,
          status: input.status,
          updatedAt: now(),
        })
        .where(eq(messages.id, input.assistantMessageId));
    },

    async insertCheckpoint(input: {
      sessionId: string;
      content: string;
      sequence: number;
    }) {
      await db.insert(generationCheckpoints).values({
        sessionId: input.sessionId,
        content: input.content,
        sequence: input.sequence,
        createdAt: now(),
      });
    },

    async listMessages(conversationId: string) {
      return db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.createdAt)],
      });
    },

    async listCheckpoints(sessionId: string) {
      return db.query.generationCheckpoints.findMany({
        where: eq(generationCheckpoints.sessionId, sessionId),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.sequence)],
      });
    },

    async refreshRequestStatus(requestId: string) {
      const sessions = await db.query.generationSessions.findMany({
        where: eq(generationSessions.requestId, requestId),
      });

      if (sessions.length === 0) {
        return "pending";
      }

      const statuses = sessions.map((session) => session.status);

      let status = "running";
      if (statuses.every((value) => value === "cancelled")) {
        status = "cancelled";
      } else if (statuses.every((value) => value === "error")) {
        status = "error";
      } else if (
        statuses.every((value) =>
          ["complete", "cancelled", "error"].includes(value),
        )
      ) {
        status = "complete";
      } else if (statuses.every((value) => value === "pending")) {
        status = "pending";
      }

      await this.updateRequestStatus(requestId, status);
      return status;
    },

    async getAssistantMessagesForRequest(requestId: string) {
      const sessions = await db.query.generationSessions.findMany({
        where: eq(generationSessions.requestId, requestId),
      });

      const assistantMessageIds = sessions.map(
        (session) => session.assistantMessageId,
      );
      if (assistantMessageIds.length === 0) {
        return [];
      }

      return db.query.messages.findMany({
        where: inArray(messages.id, assistantMessageIds),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.siblingIndex)],
      });
    },

    async findLatestActiveRequestForConversation(
      conversationId: string,
      userClerkId?: string,
    ) {
      const request = await db
        .select({
          id: generationRequests.id,
          status: generationRequests.status,
          clerkId: users.clerkId,
        })
        .from(generationRequests)
        .innerJoin(
          conversations,
          eq(conversations.id, generationRequests.conversationId),
        )
        .innerJoin(users, eq(users.id, conversations.userId))
        .where(
          and(
            eq(generationRequests.conversationId, conversationId),
            sql`${generationRequests.status} in ('pending', 'running', 'cancelling')`,
            userClerkId ? eq(users.clerkId, userClerkId) : undefined,
          ),
        )
        .orderBy(desc(generationRequests.createdAt))
        .limit(1);

      return request[0] ?? null;
    },
  };
}
