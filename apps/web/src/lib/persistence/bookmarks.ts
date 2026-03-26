import {
  bookmarks,
  conversations,
  messages,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type BookmarkRow = typeof bookmarks.$inferSelect;

export type ApiBookmark = {
  _id: string;
  messageId: string;
  conversationId: string;
  note?: string;
  tags: string[];
  messagePreview?: string;
  conversationTitle?: string;
  createdAt: number;
  updatedAt: number;
};

function normalizeTags(tags: string[] | undefined) {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

async function assertOwnedBookmark(clerkUserId: string, bookmarkId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const bookmark = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, user.id)),
  });

  if (!bookmark) {
    throw new NotFoundError("Bookmark", bookmarkId);
  }

  return { db, user, bookmark };
}

async function assertOwnedMessage(
  clerkUserId: string,
  messageId: string,
  conversationId?: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);

  const row = await db
    .select({
      messageId: messages.id,
      conversationId: messages.conversationId,
      messagePreview: messages.content,
      conversationTitle: conversations.title,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(messages.id, messageId),
        eq(conversations.userId, user.id),
        conversationId
          ? eq(messages.conversationId, conversationId)
          : undefined,
      ),
    )
    .limit(1);

  if (!row[0]) {
    throw new NotFoundError("Message", messageId);
  }

  return {
    db,
    user,
    ownedMessage: row[0],
  };
}

async function hydrateBookmark(bookmark: BookmarkRow): Promise<ApiBookmark> {
  const db = getPersistenceDb();
  const rows = await db
    .select({
      messagePreview: messages.content,
      conversationTitle: conversations.title,
    })
    .from(bookmarks)
    .innerJoin(messages, eq(messages.id, bookmarks.messageId))
    .innerJoin(conversations, eq(conversations.id, bookmarks.conversationId))
    .where(eq(bookmarks.id, bookmark.id))
    .limit(1);

  return {
    _id: bookmark.id,
    messageId: bookmark.messageId,
    conversationId: bookmark.conversationId,
    note: bookmark.note ?? undefined,
    tags: bookmark.tags ?? [],
    messagePreview: rows[0]?.messagePreview ?? undefined,
    conversationTitle: rows[0]?.conversationTitle ?? undefined,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}

export async function listBookmarks(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);

  const rows = await db
    .select({
      bookmark: bookmarks,
      messagePreview: messages.content,
      conversationTitle: conversations.title,
    })
    .from(bookmarks)
    .innerJoin(messages, eq(messages.id, bookmarks.messageId))
    .innerJoin(conversations, eq(conversations.id, bookmarks.conversationId))
    .where(eq(bookmarks.userId, user.id))
    .orderBy(desc(bookmarks.createdAt));

  return rows.map(({ bookmark, messagePreview, conversationTitle }) => ({
    _id: bookmark.id,
    messageId: bookmark.messageId,
    conversationId: bookmark.conversationId,
    note: bookmark.note ?? undefined,
    tags: bookmark.tags ?? [],
    messagePreview,
    conversationTitle,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  }));
}

export async function getBookmarkByMessage(
  clerkUserId: string,
  messageId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const bookmark = await db.query.bookmarks.findFirst({
    where: and(
      eq(bookmarks.userId, user.id),
      eq(bookmarks.messageId, messageId),
    ),
  });

  if (!bookmark) {
    return null;
  }

  return hydrateBookmark(bookmark);
}

export async function createBookmark(
  clerkUserId: string,
  input: {
    messageId: string;
    conversationId: string;
    note?: string;
    tags?: string[];
  },
) {
  const { db, user, ownedMessage } = await assertOwnedMessage(
    clerkUserId,
    input.messageId,
    input.conversationId,
  );

  const existing = await db.query.bookmarks.findFirst({
    where: and(
      eq(bookmarks.userId, user.id),
      eq(bookmarks.messageId, ownedMessage.messageId),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(bookmarks)
      .set({
        note: input.note?.trim() || existing.note,
        tags:
          input.tags !== undefined ? normalizeTags(input.tags) : existing.tags,
        updatedAt: Date.now(),
      })
      .where(eq(bookmarks.id, existing.id))
      .returning();

    if (!updated) {
      throw new ConflictError("Failed to update existing bookmark");
    }

    return hydrateBookmark(updated);
  }

  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      userId: user.id,
      messageId: ownedMessage.messageId,
      conversationId: ownedMessage.conversationId,
      note: input.note?.trim() || null,
      tags: normalizeTags(input.tags),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning();

  if (!bookmark) {
    throw new Error("Failed to create bookmark");
  }

  return {
    _id: bookmark.id,
    messageId: bookmark.messageId,
    conversationId: bookmark.conversationId,
    note: bookmark.note ?? undefined,
    tags: bookmark.tags ?? [],
    messagePreview: ownedMessage.messagePreview,
    conversationTitle: ownedMessage.conversationTitle,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}

export async function updateBookmark(
  clerkUserId: string,
  bookmarkId: string,
  input: {
    note?: string;
    tags?: string[];
  },
) {
  const { db, bookmark } = await assertOwnedBookmark(clerkUserId, bookmarkId);
  const [updated] = await db
    .update(bookmarks)
    .set({
      note:
        input.note !== undefined ? input.note.trim() || null : bookmark.note,
      tags:
        input.tags !== undefined ? normalizeTags(input.tags) : bookmark.tags,
      updatedAt: Date.now(),
    })
    .where(eq(bookmarks.id, bookmark.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update bookmark");
  }

  return hydrateBookmark(updated);
}

export async function deleteBookmark(clerkUserId: string, bookmarkId: string) {
  const { db, bookmark } = await assertOwnedBookmark(clerkUserId, bookmarkId);
  await db.delete(bookmarks).where(eq(bookmarks.id, bookmark.id));
  return { deleted: true, bookmarkId: bookmark.id };
}

export async function addBookmarkTag(
  clerkUserId: string,
  bookmarkId: string,
  tag: string,
) {
  const { bookmark } = await assertOwnedBookmark(clerkUserId, bookmarkId);
  return updateBookmark(clerkUserId, bookmarkId, {
    tags: Array.from(new Set([...(bookmark.tags ?? []), tag])),
  });
}

export async function removeBookmarkTag(
  clerkUserId: string,
  bookmarkId: string,
  tag: string,
) {
  const { bookmark } = await assertOwnedBookmark(clerkUserId, bookmarkId);
  return updateBookmark(clerkUserId, bookmarkId, {
    tags: (bookmark.tags ?? []).filter((existingTag) => existingTag !== tag),
  });
}
