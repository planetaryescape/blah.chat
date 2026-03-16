import { and, eq } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { attachments } from "../schema";

export interface CreateAttachmentInput {
  messageId: string;
  conversationId: string;
  userId: string;
  type: "file" | "image" | "audio";
  key: string;
  bucket: string;
  name: string;
  mimeType: string;
  size: number;
}

export function createAttachmentRepository(db: PersistenceDb) {
  return {
    async create(input: CreateAttachmentInput) {
      const [attachment] = await db
        .insert(attachments)
        .values({
          messageId: input.messageId,
          conversationId: input.conversationId,
          userId: input.userId,
          type: input.type,
          key: input.key,
          bucket: input.bucket,
          name: input.name,
          mimeType: input.mimeType,
          size: input.size,
          createdAt: Date.now(),
        })
        .returning();

      if (!attachment) {
        throw new Error("Failed to create attachment");
      }

      return attachment;
    },

    async listByMessage(input: { messageId: string; conversationId: string }) {
      return db.query.attachments.findMany({
        where: and(
          eq(attachments.messageId, input.messageId),
          eq(attachments.conversationId, input.conversationId),
        ),
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });
    },
  };
}
