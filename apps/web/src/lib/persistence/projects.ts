import { attachments, conversations } from "@blah-chat/persistence-postgres";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

export type ApiProjectAttachment = {
  _id: string;
  _creationTime: number;
  messageId: string;
  conversationId: string;
  type: "file" | "image" | "audio";
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
};

export async function listProjectAttachments(
  clerkUserId: string,
  projectId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const ownedConversations = await db.query.conversations.findMany({
    where: and(
      eq(conversations.userId, user.id),
      eq(conversations.projectId, projectId),
    ),
  });

  if (ownedConversations.length === 0) {
    return [] as ApiProjectAttachment[];
  }

  const rows = await db.query.attachments.findMany({
    where: inArray(
      attachments.conversationId,
      ownedConversations.map((conversation) => conversation.id),
    ),
    orderBy: [desc(attachments.createdAt)],
  });

  return rows.map((row) => ({
    _id: row.id,
    _creationTime: row.createdAt,
    messageId: row.messageId,
    conversationId: row.conversationId,
    type: row.type as "file" | "image" | "audio",
    storageId: row.key,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
    createdAt: row.createdAt,
  }));
}
