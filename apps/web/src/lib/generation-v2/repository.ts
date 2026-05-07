import {
  attachments,
  comparisonVotes,
  conversations,
  generationCheckpoints,
  generationRequestIntegrations,
  generationRequests,
  generationSessions,
  type Message,
  messageEdges,
  messages,
  messageToolCalls,
  type PersistenceDb,
  routingCandidateScores,
  routingDecisions,
  routingFeedback,
  routingOutcomes,
  routingPolicies,
  userPreferences,
  users,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { buildConsolidationPrompt } from "@/lib/consolidation";
import {
  getConversationSelectedIntegrationIds,
  snapshotGenerationRequestIntegrations,
} from "@/lib/persistence/conversationIntegrations";
import type {
  ClerkUserProfile,
  GenerationToolCall,
  PersistedRequestBundle,
  StartedGeneration,
  StartGenerationInput,
} from "./types";

const now = () => Date.now();
const DEFAULT_ROUTING_POLICY_CONFIG = {
  version: 1,
  historyWindow: 50,
  weights: {
    binRank: 0.4,
    successRate: 2,
    errorRate: 1.5,
    cancelRate: 0.75,
    latencySeconds: 0.15,
    ttftSeconds: 0.15,
    costScore: 1,
    speedScore: 0.5,
    stickyBonus: 1.25,
    degradedPenalty: 1.5,
    downPenalty: 4,
    comparisonWinRate: 1.0,
    explorationRate: 0.05,
  },
} as const;

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

async function snapshotConversationIntegrationsForRequest(input: {
  db: PersistenceDb;
  requestId: string;
  conversationId: string;
  userId: string;
}) {
  const selectedIntegrationIds = await getConversationSelectedIntegrationIds(
    input.db,
    input.conversationId,
  );

  return snapshotGenerationRequestIntegrations({
    db: input.db,
    requestId: input.requestId,
    userId: input.userId,
    selectedIntegrationIds,
  });
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

function getRoutingSignal(input: {
  outcome: "winner" | "tie" | "both_bad";
  winnerMessageId?: string | null;
  assistantMessageId: string;
}) {
  if (input.outcome === "tie") {
    return "tie";
  }

  if (input.outcome === "both_bad") {
    return "both_bad";
  }

  if (!input.winnerMessageId) {
    throw new Error("Winner outcome requires winnerMessageId");
  }

  return input.assistantMessageId === input.winnerMessageId ? "win" : "loss";
}

function normalizeVoteOutcome(
  rating: "winner" | "left_better" | "right_better" | "tie" | "both_bad",
) {
  if (rating === "tie") {
    return "tie" as const;
  }

  if (rating === "both_bad") {
    return "both_bad" as const;
  }

  return "winner" as const;
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

      const requestedParentMessageId =
        input.parentMessageId ?? conversation.activeLeafMessageId ?? null;
      const parentIds = requestedParentMessageId
        ? [requestedParentMessageId]
        : [];
      const parentMessage = parentIds[0]
        ? await db.query.messages.findFirst({
            where: and(
              eq(messages.id, parentIds[0]),
              eq(messages.conversationId, conversation.id),
            ),
          })
        : null;
      if (input.parentMessageId && !parentMessage) {
        throw new Error("Parent message not found");
      }
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
          clientMessageId: input.clientMessageId ?? null,
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

      await snapshotConversationIntegrationsForRequest({
        db,
        requestId: request.id,
        conversationId: conversation.id,
        userId: user.id,
      });

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

      if (!userMessage.userId) {
        throw new Error("User message missing user id");
      }

      await snapshotConversationIntegrationsForRequest({
        db,
        requestId: request.id,
        conversationId: assistantMessage.conversationId,
        userId: userMessage.userId,
      });

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

      if (!editedUserMessage.userId) {
        throw new Error("Edited message missing user id");
      }

      await snapshotConversationIntegrationsForRequest({
        db,
        requestId: request.id,
        conversationId: originalMessage.conversationId,
        userId: editedUserMessage.userId,
      });

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

    async getComparisonGroupState(comparisonGroupId: string) {
      const groupedMessages = await db.query.messages.findMany({
        where: eq(messages.comparisonGroupId, comparisonGroupId),
        orderBy: (table, { asc: orderAsc }) => [
          orderAsc(table.createdAt),
          orderAsc(table.siblingIndex),
        ],
      });

      if (groupedMessages.length === 0) {
        return null;
      }

      const assistantMessages = groupedMessages.filter(
        (message) => message.role === "assistant",
      );

      let userMessage =
        groupedMessages.find((message) => message.role === "user") ?? null;

      if (!userMessage && assistantMessages[0]) {
        const parentEdge = await db.query.messageEdges.findFirst({
          where: eq(messageEdges.childMessageId, assistantMessages[0].id),
          orderBy: (table, { asc: orderAsc }) => [orderAsc(table.position)],
        });

        userMessage = parentEdge
          ? ((await db.query.messages.findFirst({
              where: eq(messages.id, parentEdge.parentMessageId),
            })) ?? null)
          : null;
      }

      if (!userMessage) {
        return null;
      }

      const sessions =
        assistantMessages.length === 0
          ? []
          : await db.query.generationSessions.findMany({
              where: inArray(
                generationSessions.assistantMessageId,
                assistantMessages.map((message) => message.id),
              ),
              orderBy: (table, { asc: orderAsc }) => [
                orderAsc(table.createdAt),
              ],
            });

      const requestIds = [
        ...new Set(sessions.map((session) => session.requestId)),
      ];
      const requests =
        requestIds.length === 0
          ? []
          : await db.query.generationRequests.findMany({
              where: inArray(generationRequests.id, requestIds),
              orderBy: (table, { desc: orderDesc }) => [
                orderDesc(table.createdAt),
              ],
            });

      const currentRequest = requests[0] ?? null;
      const activeRequest =
        currentRequest &&
        ["pending", "running", "cancelling"].includes(currentRequest.status)
          ? currentRequest
          : null;

      const latestVote = await db.query.comparisonVotes.findFirst({
        where: eq(comparisonVotes.comparisonGroupId, comparisonGroupId),
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.votedAt)],
      });

      return {
        comparisonGroupId,
        conversationId: userMessage.conversationId,
        userMessageId: userMessage.id,
        status: currentRequest?.status ?? "complete",
        requestId: activeRequest?.id ?? null,
        assistantMessagesById: Object.fromEntries(
          assistantMessages.map((message) => [
            message.id,
            {
              content: message.content,
              status: message.status,
              model: message.model,
            },
          ]),
        ) as Record<
          string,
          {
            content: string;
            status: string;
            model: string | null;
          }
        >,
        sessionsByMessageId: Object.fromEntries(
          assistantMessages.map((message) => {
            const session = sessions.find(
              (candidate) => candidate.assistantMessageId === message.id,
            );

            return [
              message.id,
              {
                sessionId: session?.id ?? null,
                modelId: session?.modelId ?? message.model ?? null,
                status: session?.status ?? message.status,
              },
            ];
          }),
        ) as Record<
          string,
          {
            sessionId: string | null;
            modelId: string | null;
            status: string;
          }
        >,
        latestVote: latestVote
          ? {
              outcome: normalizeVoteOutcome(
                latestVote.rating as
                  | "left_better"
                  | "right_better"
                  | "tie"
                  | "both_bad",
              ),
              winnerMessageId: latestVote.winnerMessageId,
              votedAt: latestVote.votedAt,
            }
          : null,
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

      if (!userMessage.userId) {
        throw new Error("Comparison prompt missing user id");
      }

      await snapshotConversationIntegrationsForRequest({
        db,
        requestId: request.id,
        conversationId: conversation.id,
        userId: userMessage.userId,
      });

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

      await snapshotConversationIntegrationsForRequest({
        db,
        requestId: request.id,
        conversationId: conversation.id,
        userId: input.userId,
      });

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
      const integrations =
        await db.query.generationRequestIntegrations.findMany({
          where: eq(generationRequestIntegrations.requestId, request.id),
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
        requestStatus: request.status,
        conversationId: conversation.id,
        userId: user.id,
        userMessageId: request.userMessageId,
        requestedModelIds: request.requestedModels,
        integrations: integrations.map((integration) => ({
          integrationId: integration.integrationId,
          integrationName: integration.integrationName,
          composioConnectionId: integration.composioConnectionId,
          connectionStatus: integration.connectionStatus,
        })),
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

    async claimRequestForProcessing(requestId: string) {
      const claimed = await db
        .update(generationRequests)
        .set({ status: "running", updatedAt: now() })
        .where(
          and(
            eq(generationRequests.id, requestId),
            eq(generationRequests.status, "pending"),
          ),
        )
        .returning();
      return claimed.length > 0;
    },

    async getRequestStatus(requestId: string): Promise<string | null> {
      const row = await db.query.generationRequests.findFirst({
        where: eq(generationRequests.id, requestId),
        columns: { status: true },
      });
      return row?.status ?? null;
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

    async markRequestCancelling(requestId: string) {
      await db
        .update(generationRequests)
        .set({
          status: "cancelling",
          updatedAt: now(),
        })
        .where(eq(generationRequests.id, requestId));
    },

    async markRequestSessionsCancelling(requestId: string) {
      await db
        .update(generationSessions)
        .set({
          status: "cancelling",
          updatedAt: now(),
        })
        .where(
          and(
            eq(generationSessions.requestId, requestId),
            sql`${generationSessions.status} not in ('complete', 'cancelled', 'error')`,
          ),
        );
    },

    async markSessionCancelling(sessionId: string) {
      await db
        .update(generationSessions)
        .set({
          status: "cancelling",
          updatedAt: now(),
        })
        .where(
          and(
            eq(generationSessions.id, sessionId),
            sql`${generationSessions.status} not in ('complete', 'cancelled', 'error')`,
          ),
        );
    },

    async updateSessionModel(input: {
      sessionId: string;
      assistantMessageId: string;
      modelId: string;
    }) {
      await db
        .update(generationSessions)
        .set({
          modelId: input.modelId,
          updatedAt: now(),
        })
        .where(eq(generationSessions.id, input.sessionId));

      await db
        .update(messages)
        .set({
          model: input.modelId,
          updatedAt: now(),
        })
        .where(eq(messages.id, input.assistantMessageId));
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

    async replaceAssistantToolCalls(input: {
      assistantMessageId: string;
      conversationId: string;
      userId: string;
      toolCalls: GenerationToolCall[];
    }) {
      await db
        .delete(messageToolCalls)
        .where(eq(messageToolCalls.messageId, input.assistantMessageId));

      if (input.toolCalls.length === 0) {
        return;
      }

      await db.insert(messageToolCalls).values(
        input.toolCalls.map((toolCall) => ({
          messageId: input.assistantMessageId,
          conversationId: input.conversationId,
          userId: input.userId,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          args: toolCall.args,
          result: toolCall.result,
          textPosition: toolCall.textPosition,
          isPartial: toolCall.isPartial ?? false,
          timestamp: toolCall.timestamp,
          createdAt: now(),
        })),
      );
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

    async getOrCreateRoutingDecision(input: {
      policyId?: string | null;
      requestId: string;
      conversationId: string;
      userId: string;
      selectedModelId: string;
      routeLabel?: string | null;
      reasoning?: string | null;
      details?: Record<string, unknown>;
    }) {
      const existing = await db.query.routingDecisions.findFirst({
        where: and(
          eq(routingDecisions.generationRequestId, input.requestId),
          eq(routingDecisions.selectedModelId, input.selectedModelId),
        ),
      });

      if (existing) {
        return existing;
      }

      const [decision] = await db
        .insert(routingDecisions)
        .values({
          policyId: input.policyId ?? null,
          generationRequestId: input.requestId,
          conversationId: input.conversationId,
          userId: input.userId,
          routeLabel: input.routeLabel ?? "explicit",
          selectedModelId: input.selectedModelId,
          reasoning: input.reasoning ?? null,
          input: input.details ?? null,
          createdAt: now(),
        })
        .returning();

      if (!decision) {
        throw new Error("Failed to create routing decision");
      }

      return decision;
    },

    async getOrCreateActiveRoutingPolicy() {
      const existing = await db.query.routingPolicies.findFirst({
        where: eq(routingPolicies.isActive, true),
      });

      if (existing) {
        return existing;
      }

      const [policy] = await db
        .insert(routingPolicies)
        .values({
          name: "router_v2_default",
          description: "Default Postgres router policy",
          isActive: true,
          strategy: "outcome_weighted",
          config: DEFAULT_ROUTING_POLICY_CONFIG,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      if (!policy) {
        throw new Error("Failed to create active routing policy");
      }

      return policy;
    },

    async replaceRoutingCandidateScores(input: {
      decisionId: string;
      scores: Array<{
        modelId: string;
        provider?: string | null;
        score: number;
        rank: number;
        features?: Record<string, unknown>;
      }>;
    }) {
      await db
        .delete(routingCandidateScores)
        .where(eq(routingCandidateScores.decisionId, input.decisionId));

      if (input.scores.length === 0) {
        return;
      }

      await db.insert(routingCandidateScores).values(
        input.scores.map((score) => ({
          decisionId: input.decisionId,
          modelId: score.modelId,
          provider: score.provider ?? null,
          score: score.score,
          rank: score.rank,
          features: score.features ?? null,
          createdAt: now(),
        })),
      );
    },

    async listRecentRoutingOutcomes(modelIds: string[], limit = 100) {
      if (modelIds.length === 0) {
        return [];
      }

      return db
        .select({
          selectedModelId: routingDecisions.selectedModelId,
          status: routingOutcomes.status,
          latencyMs: routingOutcomes.latencyMs,
          ttftMs: routingOutcomes.ttftMs,
          costUsd: routingOutcomes.costUsd,
          createdAt: routingOutcomes.createdAt,
        })
        .from(routingOutcomes)
        .innerJoin(
          routingDecisions,
          eq(routingDecisions.id, routingOutcomes.decisionId),
        )
        .where(inArray(routingDecisions.selectedModelId, modelIds))
        .orderBy(desc(routingOutcomes.createdAt))
        .limit(limit);
    },

    async listRecentProviderHealth() {
      return db.query.providerHealthSnapshots.findMany({
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.capturedAt)],
        limit: 200,
      });
    },

    async listRecentComparisonFeedback(modelIds: string[], limit = 200) {
      if (modelIds.length === 0) {
        return [];
      }

      return db
        .select({
          modelId: routingDecisions.selectedModelId,
          signal: routingFeedback.signal,
        })
        .from(routingFeedback)
        .innerJoin(
          routingOutcomes,
          eq(routingOutcomes.id, routingFeedback.outcomeId),
        )
        .innerJoin(
          routingDecisions,
          eq(routingDecisions.id, routingOutcomes.decisionId),
        )
        .where(
          and(
            inArray(routingDecisions.selectedModelId, modelIds),
            inArray(routingFeedback.signal, [
              "win",
              "loss",
              "tie",
              "regenerated",
              "model_switch",
              "both_bad",
            ]),
          ),
        )
        .orderBy(desc(routingFeedback.createdAt))
        .limit(limit);
    },

    async upsertRoutingOutcome(input: {
      decisionId: string;
      requestId: string;
      sessionId: string;
      status: "complete" | "cancelled" | "error";
      ttftMs?: number | null;
      latencyMs?: number | null;
      totalTokens?: number | null;
      inputTokens?: number | null;
      outputTokens?: number | null;
      costUsd?: number | null;
      metadata?: Record<string, unknown>;
    }) {
      const existing = await db.query.routingOutcomes.findFirst({
        where: eq(routingOutcomes.generationSessionId, input.sessionId),
      });

      if (existing) {
        const [updated] = await db
          .update(routingOutcomes)
          .set({
            decisionId: input.decisionId,
            generationRequestId: input.requestId,
            status: input.status,
            ttftMs: input.ttftMs ?? null,
            latencyMs: input.latencyMs ?? null,
            totalTokens: input.totalTokens ?? null,
            inputTokens: input.inputTokens ?? null,
            outputTokens: input.outputTokens ?? null,
            costUsd: input.costUsd ?? null,
            metadata: input.metadata ?? null,
          })
          .where(eq(routingOutcomes.id, existing.id))
          .returning();

        if (!updated) {
          throw new Error("Failed to update routing outcome");
        }

        return updated;
      }

      const [outcome] = await db
        .insert(routingOutcomes)
        .values({
          decisionId: input.decisionId,
          generationRequestId: input.requestId,
          generationSessionId: input.sessionId,
          status: input.status,
          ttftMs: input.ttftMs ?? null,
          latencyMs: input.latencyMs ?? null,
          totalTokens: input.totalTokens ?? null,
          inputTokens: input.inputTokens ?? null,
          outputTokens: input.outputTokens ?? null,
          costUsd: input.costUsd ?? null,
          metadata: input.metadata ?? null,
          createdAt: now(),
        })
        .returning();

      if (!outcome) {
        throw new Error("Failed to create routing outcome");
      }

      return outcome;
    },

    async recordRegenerationFeedback(assistantMessageId: string) {
      const session = await db.query.generationSessions.findFirst({
        where: eq(generationSessions.assistantMessageId, assistantMessageId),
      });
      if (!session) return null;

      const outcome = await db.query.routingOutcomes.findFirst({
        where: eq(routingOutcomes.generationSessionId, session.id),
      });
      if (!outcome) return null;

      const [feedback] = await db
        .insert(routingFeedback)
        .values({
          outcomeId: outcome.id,
          signal: "regenerated",
          metadata: { assistantMessageId },
          createdAt: now(),
        })
        .returning();

      return feedback ?? null;
    },

    async recordModelSwitchFeedback(previousAssistantMessageId: string) {
      const session = await db.query.generationSessions.findFirst({
        where: eq(
          generationSessions.assistantMessageId,
          previousAssistantMessageId,
        ),
      });
      if (!session) return null;

      const outcome = await db.query.routingOutcomes.findFirst({
        where: eq(routingOutcomes.generationSessionId, session.id),
      });
      if (!outcome) return null;

      const [feedback] = await db
        .insert(routingFeedback)
        .values({
          outcomeId: outcome.id,
          signal: "model_switch",
          metadata: { previousAssistantMessageId },
          createdAt: now(),
        })
        .returning();

      return feedback ?? null;
    },

    async findLastAutoRoutedAssistantMessageId(
      conversationId: string,
    ): Promise<string | null> {
      const row = await db
        .select({ assistantMessageId: generationSessions.assistantMessageId })
        .from(generationSessions)
        .innerJoin(
          generationRequests,
          eq(generationRequests.id, generationSessions.requestId),
        )
        .innerJoin(
          routingDecisions,
          eq(routingDecisions.generationRequestId, generationRequests.id),
        )
        .where(
          and(
            eq(generationRequests.conversationId, conversationId),
            sql`${routingDecisions.routeLabel} NOT IN ('explicit', 'manual_default')`,
            eq(generationSessions.status, "complete"),
          ),
        )
        .orderBy(desc(generationSessions.updatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      return row?.assistantMessageId ?? null;
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
      outcome: "winner" | "tie" | "both_bad";
    }) {
      if (input.outcome === "winner" && !input.winnerMessageId) {
        throw new Error("Winner outcome requires winnerMessageId");
      }

      const [vote] = await db
        .insert(comparisonVotes)
        .values({
          userId: input.userId,
          comparisonGroupId: input.comparisonGroupId,
          winnerMessageId: input.winnerMessageId ?? null,
          rating: input.outcome,
          votedAt: now(),
        })
        .returning();

      if (!vote) {
        throw new Error("Failed to record vote");
      }

      const assistantMessages = await db.query.messages.findMany({
        where: and(
          eq(messages.comparisonGroupId, input.comparisonGroupId),
          eq(messages.role, "assistant"),
        ),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.siblingIndex)],
      });

      if (assistantMessages.length > 0) {
        const sessions = await db.query.generationSessions.findMany({
          where: inArray(
            generationSessions.assistantMessageId,
            assistantMessages.map((message) => message.id),
          ),
        });
        const outcomeRows =
          sessions.length === 0
            ? []
            : await db.query.routingOutcomes.findMany({
                where: inArray(
                  routingOutcomes.generationSessionId,
                  sessions.map((session) => session.id),
                ),
              });
        const sessionByAssistantMessageId = new Map(
          sessions.map((session) => [session.assistantMessageId, session]),
        );
        const outcomeBySessionId = new Map(
          outcomeRows.map((outcome) => [outcome.generationSessionId, outcome]),
        );

        await db.insert(routingFeedback).values(
          assistantMessages.map((message) => {
            const session = sessionByAssistantMessageId.get(message.id);
            const outcome = session
              ? outcomeBySessionId.get(session.id)
              : undefined;

            return {
              outcomeId: outcome?.id ?? null,
              comparisonGroupId: input.comparisonGroupId,
              winnerMessageId: input.winnerMessageId ?? null,
              signal: getRoutingSignal({
                outcome: input.outcome,
                winnerMessageId: input.winnerMessageId,
                assistantMessageId: message.id,
              }),
              metadata: {
                outcome: input.outcome,
                voteId: vote.id,
                assistantMessageId: message.id,
                modelId: message.model ?? null,
                isWinner:
                  input.winnerMessageId !== undefined &&
                  input.winnerMessageId !== null &&
                  input.winnerMessageId === message.id,
              },
              createdAt: now(),
            };
          }),
        );
      }

      return vote;
    },

    async getAutoRoutingContext(input: {
      conversationId: string;
      userId: string;
      userMessageId: string;
    }) {
      const preferenceRows = await db.query.userPreferences.findMany({
        where: and(
          eq(userPreferences.userId, input.userId),
          inArray(userPreferences.key, [
            "autoRouterEnabled",
            "autoRouterCostBias",
            "autoRouterSpeedBias",
            "defaultModel",
          ]),
        ),
      });
      const preferences = Object.fromEntries(
        preferenceRows.map((row) => [row.key, row.value]),
      ) as Record<string, unknown>;

      const promptPath = await this.getPathToMessage(
        input.conversationId,
        input.userMessageId,
      );
      const previousAssistant = [...promptPath]
        .reverse()
        .find(
          (message) =>
            message.role === "assistant" &&
            !!message.model &&
            message.model !== "auto",
        );
      const previousDecisions = previousAssistant?.model
        ? await db.query.routingDecisions.findMany({
            where: and(
              eq(routingDecisions.conversationId, input.conversationId),
              eq(routingDecisions.selectedModelId, previousAssistant.model),
            ),
            orderBy: (table, { desc: orderDesc }) => [
              orderDesc(table.createdAt),
            ],
            limit: 10,
          })
        : [];
      const previousDecision =
        previousDecisions.find(
          (decision) =>
            decision.routeLabel !== null &&
            decision.routeLabel !== "explicit" &&
            decision.routeLabel !== "manual_default",
        ) ??
        previousDecisions[0] ??
        null;
      const messageAttachments = await db
        .select({
          mimeType: attachments.mimeType,
        })
        .from(attachments)
        .where(eq(attachments.messageId, input.userMessageId));

      return {
        autoRouterEnabled: preferences.autoRouterEnabled,
        costBias: preferences.autoRouterCostBias,
        speedBias: preferences.autoRouterSpeedBias,
        defaultModel: preferences.defaultModel,
        previousModelId: previousAssistant?.model ?? null,
        previousRouteLabel: previousDecision?.routeLabel ?? null,
        attachmentTypes: messageAttachments.map(
          (attachment) => attachment.mimeType,
        ),
      };
    },

    async listCheckpoints(sessionId: string) {
      return db.query.generationCheckpoints.findMany({
        where: eq(generationCheckpoints.sessionId, sessionId),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.sequence)],
      });
    },

    async getRequestStreamReplay(requestId: string) {
      const request = await db.query.generationRequests.findFirst({
        where: eq(generationRequests.id, requestId),
      });
      if (!request) {
        return null;
      }

      const sessions = await db.query.generationSessions.findMany({
        where: eq(generationSessions.requestId, requestId),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.createdAt)],
      });
      if (sessions.length === 0) {
        return {
          requestId,
          requestStatus: request.status,
          sessions: [],
        };
      }

      const assistantMessages = await db.query.messages.findMany({
        where: inArray(
          messages.id,
          sessions.map((session) => session.assistantMessageId),
        ),
      });
      const assistantMessageById = new Map(
        assistantMessages.map((message) => [message.id, message]),
      );

      const latestCheckpoints = await Promise.all(
        sessions.map((session) =>
          db.query.generationCheckpoints.findFirst({
            where: eq(generationCheckpoints.sessionId, session.id),
            orderBy: (table, { desc: orderDesc }) => [
              orderDesc(table.sequence),
            ],
          }),
        ),
      );

      return {
        requestId,
        requestStatus: request.status,
        sessions: sessions.map((session, index) => ({
          sessionId: session.id,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
          status: session.status,
          assistantMessage:
            assistantMessageById.get(session.assistantMessageId) ?? null,
          latestCheckpoint: latestCheckpoints[index] ?? null,
        })),
      };
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
      } else if (statuses.some((value) => value === "cancelling")) {
        status = "cancelling";
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
