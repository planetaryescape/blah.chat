import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { PersistenceDb } from "../db";
import { messageEdges, messages } from "../schema";

export interface CreateMessageInput {
  conversationId: string;
  userId?: string;
  role: string;
  content: string;
  status?: string;
  model?: string;
  comparisonGroupId?: string;
  parentMessageIds: string[];
  siblingIndex: number;
  forkReason?: string;
}

export function createMessageRepository(db: PersistenceDb) {
  return {
    async create(input: CreateMessageInput) {
      const messageId = nanoid();
      let rootMessageId = messageId;

      if (input.parentMessageIds.length > 0) {
        const parent = await db.query.messages.findFirst({
          where: and(
            eq(messages.id, input.parentMessageIds[0]!),
            eq(messages.conversationId, input.conversationId),
          ),
        });

        if (!parent) {
          throw new Error(
            `Parent message not found: ${input.parentMessageIds[0]}`,
          );
        }

        rootMessageId = parent.rootMessageId ?? parent.id;
      }

      const [message] = await db
        .insert(messages)
        .values({
          id: messageId,
          conversationId: input.conversationId,
          userId: input.userId,
          role: input.role,
          content: input.content,
          status: input.status ?? "complete",
          model: input.model,
          comparisonGroupId: input.comparisonGroupId,
          rootMessageId,
          siblingIndex: input.siblingIndex,
          forkReason: input.forkReason,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      if (!message) {
        throw new Error("Failed to create message");
      }

      if (input.parentMessageIds.length > 0) {
        await db.insert(messageEdges).values(
          input.parentMessageIds.map((parentMessageId, index) => ({
            parentMessageId,
            childMessageId: message.id,
            position: index,
            edgeType: "reply",
            createdAt: Date.now(),
          })),
        );
      }

      return message;
    },

    async listSiblings(input: {
      conversationId: string;
      parentMessageId: string;
    }) {
      const siblingEdges = await db.query.messageEdges.findMany({
        where: eq(messageEdges.parentMessageId, input.parentMessageId),
        orderBy: (edges, { asc }) => [asc(edges.position)],
      });

      const siblings = await Promise.all(
        siblingEdges.map((edge) =>
          db.query.messages.findFirst({
            where: and(
              eq(messages.id, edge.childMessageId),
              eq(messages.conversationId, input.conversationId),
            ),
          }),
        ),
      );

      return siblings
        .filter((message): message is NonNullable<typeof message> => !!message)
        .sort((left, right) => left.siblingIndex - right.siblingIndex);
    },
  };
}
