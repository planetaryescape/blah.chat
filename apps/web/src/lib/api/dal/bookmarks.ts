import {
  bookmarks,
  conversations,
  messages,
} from "@blah-chat/persistence-postgres";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";

const bulkCreateBookmarksSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const bookmarksDAL = {
  bulkCreate: async (
    clerkUserId: string,
    payload: z.infer<typeof bulkCreateBookmarksSchema>,
  ) => {
    const validated = bulkCreateBookmarksSchema.parse(payload);
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);
    const messageIds = Array.from(new Set(validated.messageIds));

    const ownedMessages = await db
      .select({
        messageId: messages.id,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(conversations.userId, user.id),
          inArray(messages.id, messageIds),
        ),
      );

    const existing = await db.query.bookmarks.findMany({
      where: and(
        eq(bookmarks.userId, user.id),
        inArray(
          bookmarks.messageId,
          ownedMessages.map((row) => row.messageId),
        ),
      ),
    });

    const existingByMessageId = new Map(
      existing.map((bookmark) => [bookmark.messageId, bookmark.id]),
    );

    const toInsert = ownedMessages.filter(
      (row) => !existingByMessageId.has(row.messageId),
    );

    let created: Array<{ id: string; messageId: string }> = [];
    if (toInsert.length > 0) {
      created = (
        await db
          .insert(bookmarks)
          .values(
            toInsert.map((row) => ({
              userId: user.id,
              messageId: row.messageId,
              conversationId: row.conversationId,
              note: validated.note,
              tags: validated.tags ?? [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })),
          )
          .returning()
      ).map((bookmark) => ({
        id: bookmark.id,
        messageId: bookmark.messageId,
      }));
    }

    const bookmarkIds = ownedMessages.flatMap((row) => {
      const existingId = existingByMessageId.get(row.messageId);
      if (existingId) {
        return [existingId];
      }

      const createdBookmark = created.find(
        (bookmark) => bookmark.messageId === row.messageId,
      );
      return createdBookmark ? [createdBookmark.id] : [];
    });

    return formatEntity(
      {
        bookmarkedCount: bookmarkIds.length,
        bookmarkIds,
      },
      "bookmark",
    );
  },
};
