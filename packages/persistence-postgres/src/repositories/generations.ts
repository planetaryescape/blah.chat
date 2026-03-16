import { and, eq } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import {
  conversations,
  generationRequests,
  generationSessions,
} from "../schema";
import { createConversationRepository } from "./conversations";
import { createMessageRepository } from "./messages";

export interface CreateSingleModelGenerationInput {
  conversationId: string;
  userId: string;
  content: string;
  modelId: string;
}

export function createGenerationRepository(db: PersistenceDb) {
  const conversationsRepo = createConversationRepository(db);
  const messagesRepo = createMessageRepository(db);

  return {
    async createSingleModel(input: CreateSingleModelGenerationInput) {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, input.conversationId),
      });

      if (!conversation) {
        throw new Error(`Conversation not found: ${input.conversationId}`);
      }

      const parentMessageIds = conversation.activeLeafMessageId
        ? [conversation.activeLeafMessageId]
        : [];

      const userMessage = await messagesRepo.create({
        conversationId: input.conversationId,
        userId: input.userId,
        role: "user",
        content: input.content,
        parentMessageIds,
        siblingIndex: 0,
      });

      const assistantMessage = await messagesRepo.create({
        conversationId: input.conversationId,
        role: "assistant",
        content: "",
        status: "pending",
        model: input.modelId,
        parentMessageIds: [userMessage.id],
        siblingIndex: 0,
      });

      const [request] = await db
        .insert(generationRequests)
        .values({
          conversationId: input.conversationId,
          userMessageId: userMessage.id,
          requestedModels: [input.modelId],
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      if (!request) {
        throw new Error("Failed to create generation request");
      }

      const [session] = await db
        .insert(generationSessions)
        .values({
          requestId: request.id,
          assistantMessageId: assistantMessage.id,
          modelId: input.modelId,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      if (!session) {
        throw new Error("Failed to create generation session");
      }

      await conversationsRepo.setActiveLeaf({
        conversationId: input.conversationId,
        activeLeafMessageId: assistantMessage.id,
      });

      return {
        request,
        session,
        userMessage,
        assistantMessage,
      };
    },

    async getSessionByAssistantMessage(input: {
      assistantMessageId: string;
      requestId: string;
    }) {
      return db.query.generationSessions.findFirst({
        where: and(
          eq(generationSessions.assistantMessageId, input.assistantMessageId),
          eq(generationSessions.requestId, input.requestId),
        ),
      });
    },
  };
}
