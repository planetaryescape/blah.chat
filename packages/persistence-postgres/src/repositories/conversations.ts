import { eq, sql } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import {
  type ConversationIncognitoSettings,
  conversations,
  type Message,
} from "../schema";

export interface CreateConversationInput {
  userId: string;
  title: string;
  model: string;
  projectId?: string | null;
  isIncognito?: boolean;
  incognitoSettings?: ConversationIncognitoSettings | null;
}

type ActivePathRow = Message & {
  depth: number;
};

export function createConversationRepository(db: PersistenceDb) {
  return {
    async create(input: CreateConversationInput) {
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId: input.userId,
          title: input.title,
          model: input.model,
          projectId: input.projectId ?? null,
          isIncognito: input.isIncognito ?? false,
          incognitoSettings: input.incognitoSettings ?? null,
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

    async togglePin(conversationId: string) {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const [updated] = await db
        .update(conversations)
        .set({
          pinned: !conversation.pinned,
          updatedAt: Date.now(),
        })
        .where(eq(conversations.id, conversationId))
        .returning();

      if (!updated) {
        throw new Error("Conversation not found");
      }

      return updated;
    },

    async toggleStar(conversationId: string) {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const [updated] = await db
        .update(conversations)
        .set({
          starred: !conversation.starred,
          updatedAt: Date.now(),
        })
        .where(eq(conversations.id, conversationId))
        .returning();

      if (!updated) {
        throw new Error("Conversation not found");
      }

      return updated;
    },

    async getActivePath(conversationId: string): Promise<Message[]> {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });

      if (!conversation?.activeLeafMessageId) {
        return [];
      }

      const result = await db.execute(sql<ActivePathRow>`
        WITH RECURSIVE active_path AS (
          SELECT
            m.id AS "id",
            m.conversation_id AS "conversationId",
            m.user_id AS "userId",
            m.role AS "role",
            m.content AS "content",
            m.status AS "status",
            m.model AS "model",
            m.comparison_group_id AS "comparisonGroupId",
            m.consolidated_message_id AS "consolidatedMessageId",
            m.is_consolidation AS "isConsolidation",
            m.root_message_id AS "rootMessageId",
            m.sibling_index AS "siblingIndex",
            m.fork_reason AS "forkReason",
            m.created_at AS "createdAt",
            m.updated_at AS "updatedAt",
            0 AS "depth"
          FROM messages m
          WHERE m.id = ${conversation.activeLeafMessageId}
            AND m.conversation_id = ${conversationId}

          UNION ALL

          SELECT
            parent.id AS "id",
            parent.conversation_id AS "conversationId",
            parent.user_id AS "userId",
            parent.role AS "role",
            parent.content AS "content",
            parent.status AS "status",
            parent.model AS "model",
            parent.comparison_group_id AS "comparisonGroupId",
            parent.consolidated_message_id AS "consolidatedMessageId",
            parent.is_consolidation AS "isConsolidation",
            parent.root_message_id AS "rootMessageId",
            parent.sibling_index AS "siblingIndex",
            parent.fork_reason AS "forkReason",
            parent.created_at AS "createdAt",
            parent.updated_at AS "updatedAt",
            active_path."depth" + 1 AS "depth"
          FROM active_path
          JOIN message_edges edge
            ON edge.child_message_id = active_path."id"
          JOIN messages parent
            ON parent.id = edge.parent_message_id
          WHERE parent.conversation_id = ${conversationId}
            AND edge.position = (
              SELECT MIN(edge_rank.position)
              FROM message_edges edge_rank
              WHERE edge_rank.child_message_id = active_path."id"
            )
        )
        SELECT
          "id",
          "conversationId",
          "userId",
          "role",
          "content",
          "status",
          "model",
          "comparisonGroupId",
          "consolidatedMessageId",
          "isConsolidation",
          "rootMessageId",
          "siblingIndex",
          "forkReason",
          "createdAt",
          "updatedAt",
          "depth"
        FROM active_path
        ORDER BY "depth" DESC
      `);

      const rows = Array.isArray(result)
        ? result
        : "rows" in result
          ? result.rows
          : [];

      return rows.map(({ depth: _depth, ...message }) => message);
    },
  };
}
