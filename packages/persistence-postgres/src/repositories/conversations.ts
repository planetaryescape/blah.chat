import { and, eq } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { conversations, type Message, messageEdges, messages } from "../schema";

export interface CreateConversationInput {
  userId: string;
  title: string;
  model: string;
}

export function createConversationRepository(db: PersistenceDb) {
  return {
    async create(input: CreateConversationInput) {
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId: input.userId,
          title: input.title,
          model: input.model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      if (!conversation) {
        throw new Error("Failed to create conversation");
      }

      return conversation;
    },

    async setActiveLeaf(input: {
      conversationId: string;
      activeLeafMessageId: string | null;
    }) {
      await db
        .update(conversations)
        .set({
          activeLeafMessageId: input.activeLeafMessageId,
          updatedAt: Date.now(),
        })
        .where(eq(conversations.id, input.conversationId));
    },

    async getActivePath(conversationId: string): Promise<Message[]> {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });

      if (!conversation?.activeLeafMessageId) {
        return [];
      }

      const path: Message[] = [];
      let currentId: string | null = conversation.activeLeafMessageId;

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

        const parentEdge:
          | {
              parentMessageId: string;
            }
          | undefined = await db.query.messageEdges.findFirst({
          where: eq(messageEdges.childMessageId, current.id),
          orderBy: (edges, { asc }) => [asc(edges.position)],
          columns: {
            parentMessageId: true,
          },
        });

        currentId = parentEdge?.parentMessageId ?? null;
      }

      return path;
    },
  };
}
