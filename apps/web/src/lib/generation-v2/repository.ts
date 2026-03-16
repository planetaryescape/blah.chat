import {
  comparisonVotes,
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
import { buildConsolidationPrompt } from "@/lib/consolidation";
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

async function createAssistantSession(input: {
  db: PersistenceDb;
  requestId: string;
  conversationId: string;
  parentMessageId: string;
  modelId: string;
  comparisonGroupId?: string | null;
  rootMessageId: string;
  siblingIndex?: number;
  forkReason?: string | null;
  isConsolidation?: boolean;
}) {
  const siblingIndex =
    input.siblingIndex ??
    (await getNextSiblingIndex({
      db: input.db,
      conversationId: input.conversationId,
      parentIds: [input.parentMessageId],
    }));
  const assistantMessageId = nanoid();
  const [assistantMessage] = await input.db
    .insert(messages)
    .values({
      id: assistantMessageId,
      conversationId: input.conversationId,
      role: "assistant",
      content: "",
      status: "pending",
      model: input.modelId,
      comparisonGroupId: input.comparisonGroupId ?? null,
      isConsolidation: input.isConsolidation ?? false,
      rootMessageId: input.rootMessageId,
      siblingIndex,
      forkReason: input.forkReason ?? null,
      createdAt: now(),
      updatedAt: now(),
    })
    .returning();

  if (!assistantMessage) {
    throw new Error("Failed to create assistant message");
  }

  await input.db.insert(messageEdges).values({
    parentMessageId: input.parentMessageId,
    childMessageId: assistantMessage.id,
    position: 0,
    edgeType: "reply",
    createdAt: now(),
  });

  const [session] = await input.db
    .insert(generationSessions)
    .values({
      requestId: input.requestId,
      assistantMessageId: assistantMessage.id,
      modelId: input.modelId,
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
      const comparisonGroupId = modelIds.length > 1 ? nanoid() : null;

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
          comparisonGroupId,
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
          promptOverride: null,
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create generation request");
      }

      const assistantRows = await Promise.all(
        modelIds.map((modelId, index) =>
          createAssistantSession({
            db,
            requestId: request.id,
            conversationId: conversation.id,
            parentMessageId: userMessage.id,
            modelId,
            comparisonGroupId,
            rootMessageId: userMessage.rootMessageId ?? userMessage.id,
            siblingIndex: index,
          }),
        ),
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
          promptOverride: null,
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create regeneration request");
      }

      const { assistantMessage: regeneratedAssistant } =
        await createAssistantSession({
          db,
          requestId: request.id,
          conversationId: assistantMessage.conversationId,
          parentMessageId: userMessage.id,
          modelId: resolvedModel,
          rootMessageId: userMessage.rootMessageId ?? userMessage.id,
          siblingIndex: nextSiblingIndex,
          forkReason: "regenerate",
        });

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
          promptOverride: null,
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create edit request");
      }

      const { assistantMessage } = await createAssistantSession({
        db,
        requestId: request.id,
        conversationId: originalMessage.conversationId,
        parentMessageId: editedUserMessage.id,
        modelId: resolvedModel,
        rootMessageId: editedUserMessage.rootMessageId ?? editedUserMessage.id,
        siblingIndex: 0,
      });

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

    async getComparisonContext(comparisonGroupId: string) {
      const groupedMessages = await db.query.messages.findMany({
        where: eq(messages.comparisonGroupId, comparisonGroupId),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.createdAt)],
      });
      const responses = groupedMessages.filter(
        (message) => message.role === "assistant",
      );
      let userMessage: Message | null =
        groupedMessages.find((message) => message.role === "user") ?? null;

      if (!userMessage && responses[0]) {
        const parentEdge = await db.query.messageEdges.findFirst({
          where: eq(messageEdges.childMessageId, responses[0].id),
          orderBy: (table, { asc: orderAsc }) => [orderAsc(table.position)],
        });
        userMessage = parentEdge
          ? ((await db.query.messages.findFirst({
              where: eq(messages.id, parentEdge.parentMessageId),
            })) ?? null)
          : null;
      }

      if (!userMessage || responses.length === 0) {
        throw new Error("Invalid comparison group");
      }

      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, userMessage.conversationId),
      });
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      return {
        conversation,
        userMessage,
        responses,
        prompt: buildConsolidationPrompt(
          userMessage.content,
          responses.map((response) => ({
            model: response.model || "unknown",
            content: response.content,
          })),
        ),
      };
    },

    async createSameChatConsolidationRequest(input: {
      comparisonGroupId: string;
      consolidationModel: string;
    }): Promise<StartedGeneration> {
      const { conversation, userMessage, responses, prompt } =
        await this.getComparisonContext(input.comparisonGroupId);

      const [request] = await db
        .insert(generationRequests)
        .values({
          conversationId: conversation.id,
          userMessageId: userMessage.id,
          requestedModels: [input.consolidationModel],
          promptOverride: prompt,
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create consolidation request");
      }

      const { assistantMessage } = await createAssistantSession({
        db,
        requestId: request.id,
        conversationId: conversation.id,
        parentMessageId: userMessage.id,
        modelId: input.consolidationModel,
        rootMessageId: userMessage.rootMessageId ?? userMessage.id,
        isConsolidation: true,
      });

      await Promise.all(
        responses.map((response) =>
          db
            .update(messages)
            .set({
              consolidatedMessageId: assistantMessage.id,
              updatedAt: now(),
            })
            .where(eq(messages.id, response.id)),
        ),
      );

      await db
        .update(conversations)
        .set({
          activeLeafMessageId: assistantMessage.id,
          model: input.consolidationModel,
          updatedAt: now(),
        })
        .where(eq(conversations.id, conversation.id));

      return {
        requestId: request.id,
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        assistantMessageIds: [assistantMessage.id],
        modelIds: [input.consolidationModel],
      };
    },

    async createNewConversationConsolidationRequest(input: {
      userId: string;
      comparisonGroupId: string;
      consolidationModel: string;
    }): Promise<StartedGeneration> {
      const { userMessage, prompt } = await this.getComparisonContext(
        input.comparisonGroupId,
      );
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId: input.userId,
          model: input.consolidationModel,
          title: `Consolidation: ${userMessage.content.slice(0, 50)}${userMessage.content.length > 50 ? "..." : ""}`,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!conversation) {
        throw new Error("Failed to create consolidation conversation");
      }

      const consolidationPromptMessageId = nanoid();
      const [consolidationPromptMessage] = await db
        .insert(messages)
        .values({
          id: consolidationPromptMessageId,
          conversationId: conversation.id,
          userId: input.userId,
          role: "user",
          content: prompt,
          status: "complete",
          rootMessageId: consolidationPromptMessageId,
          siblingIndex: 0,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!consolidationPromptMessage) {
        throw new Error("Failed to create consolidation prompt message");
      }

      const [request] = await db
        .insert(generationRequests)
        .values({
          conversationId: conversation.id,
          userMessageId: consolidationPromptMessage.id,
          requestedModels: [input.consolidationModel],
          promptOverride: null,
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create consolidation generation request");
      }

      const { assistantMessage } = await createAssistantSession({
        db,
        requestId: request.id,
        conversationId: conversation.id,
        parentMessageId: consolidationPromptMessage.id,
        modelId: input.consolidationModel,
        rootMessageId: consolidationPromptMessage.id,
        siblingIndex: 0,
      });

      await db
        .update(conversations)
        .set({
          activeLeafMessageId: assistantMessage.id,
          updatedAt: now(),
        })
        .where(eq(conversations.id, conversation.id));

      return {
        requestId: request.id,
        conversationId: conversation.id,
        userMessageId: consolidationPromptMessage.id,
        assistantMessageIds: [assistantMessage.id],
        modelIds: [input.consolidationModel],
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
      const promptChain = promptMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
      if (request.promptOverride) {
        const lastMessage = promptChain.at(-1);
        if (lastMessage?.role === "user") {
          lastMessage.content = request.promptOverride;
        } else {
          promptChain.push({
            role: "user",
            content: request.promptOverride,
          });
        }
      }

      return {
        requestId: request.id,
        conversationId: conversation.id,
        userId: user.id,
        userMessageId: request.userMessageId,
        promptMessages: promptChain,
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
        orderBy: (table, { asc: orderAsc }) => [
          orderAsc(table.createdAt),
          orderAsc(table.siblingIndex),
        ],
      });
    },

    async listOriginalResponses(consolidatedMessageId: string) {
      return db.query.messages.findMany({
        where: and(
          eq(messages.consolidatedMessageId, consolidatedMessageId),
          eq(messages.role, "assistant"),
        ),
        orderBy: (table, { asc: orderAsc }) => [
          orderAsc(table.createdAt),
          orderAsc(table.siblingIndex),
        ],
      });
    },

    async recordVote(input: {
      userId: string;
      comparisonGroupId: string;
      winnerMessageId?: string | null;
      rating: "left_better" | "right_better" | "tie" | "both_bad";
    }) {
      const [vote] = await db
        .insert(comparisonVotes)
        .values({
          userId: input.userId,
          comparisonGroupId: input.comparisonGroupId,
          winnerMessageId: input.winnerMessageId ?? null,
          rating: input.rating,
          votedAt: now(),
        })
        .returning();

      if (!vote) {
        throw new Error("Failed to record vote");
      }

      return vote;
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
