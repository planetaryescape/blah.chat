import "server-only";

import {
  type ConversationShare,
  conversationShares,
  conversations,
  messages,
} from "@blah-chat/persistence-postgres";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getPersistenceDb } from "./server";

export async function createConversationShare(
  userId: string,
  conversationId: string,
  opts: {
    title: string;
    isPublic?: boolean;
    password?: string;
    anonymizeUsernames?: boolean;
    expiresAt?: number;
  },
): Promise<ConversationShare> {
  const db = getPersistenceDb();
  const shareId = nanoid(12);

  const [share] = await db
    .insert(conversationShares)
    .values({
      userId,
      conversationId,
      shareId,
      title: opts.title,
      isPublic: opts.isPublic ?? true,
      password: opts.password,
      anonymizeUsernames: opts.anonymizeUsernames ?? false,
      expiresAt: opts.expiresAt,
    })
    .returning();

  return share;
}

export async function getConversationShareByShareId(
  shareId: string,
): Promise<ConversationShare | null> {
  const db = getPersistenceDb();
  const [share] = await db
    .select()
    .from(conversationShares)
    .where(eq(conversationShares.shareId, shareId))
    .limit(1);

  return share ?? null;
}

export async function getConversationShareByConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationShare | null> {
  const db = getPersistenceDb();
  const [share] = await db
    .select()
    .from(conversationShares)
    .where(
      and(
        eq(conversationShares.userId, userId),
        eq(conversationShares.conversationId, conversationId),
        eq(conversationShares.isActive, true),
      ),
    )
    .limit(1);

  return share ?? null;
}

export async function toggleConversationShare(
  userId: string,
  shareId: string,
  isActive: boolean,
): Promise<ConversationShare | null> {
  const db = getPersistenceDb();
  const [updated] = await db
    .update(conversationShares)
    .set({ isActive, updatedAt: Date.now() })
    .where(
      and(
        eq(conversationShares.shareId, shareId),
        eq(conversationShares.userId, userId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function extendConversationShareExpiration(
  userId: string,
  shareId: string,
  expiresAt: number,
): Promise<ConversationShare | null> {
  const db = getPersistenceDb();
  const [updated] = await db
    .update(conversationShares)
    .set({ expiresAt, updatedAt: Date.now() })
    .where(
      and(
        eq(conversationShares.shareId, shareId),
        eq(conversationShares.userId, userId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function incrementShareViewCount(shareId: string): Promise<void> {
  const db = getPersistenceDb();
  const share = await getConversationShareByShareId(shareId);
  if (!share) return;

  await db
    .update(conversationShares)
    .set({ viewCount: (share.viewCount ?? 0) + 1 })
    .where(eq(conversationShares.shareId, shareId));
}

export async function getSharedConversation(shareId: string) {
  const db = getPersistenceDb();
  const share = await getConversationShareByShareId(shareId);
  if (!share || !share.isActive) return null;

  if (share.expiresAt && share.expiresAt < Date.now()) return null;

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, share.conversationId))
    .limit(1);

  return conversation ?? null;
}

export async function getSharedMessages(shareId: string) {
  const db = getPersistenceDb();
  const share = await getConversationShareByShareId(shareId);
  if (!share || !share.isActive) return [];

  if (share.expiresAt && share.expiresAt < Date.now()) return [];

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, share.conversationId))
    .orderBy(messages.createdAt);

  return msgs;
}
