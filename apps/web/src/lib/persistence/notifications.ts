import {
  type NotificationData,
  type NotificationType,
  notifications,
} from "@blah-chat/persistence-postgres";
import { and, count, desc, eq, isNull, lt } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";

export type NotificationRow = typeof notifications.$inferSelect;

export interface ListNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
  cursor?: number;
}

async function assertOwnedNotification(
  clerkUserId: string,
  notificationId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const row = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, user.id),
    ),
  });
  if (!row) {
    throw new Error("Notification not found");
  }
  return { db, user, row };
}

export async function listNotifications(
  clerkUserId: string,
  options: ListNotificationsOptions = {},
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);

  const conditions = [
    eq(notifications.userId, user.id),
    isNull(notifications.dismissedAt),
  ];
  if (options.unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }
  if (typeof options.cursor === "number") {
    conditions.push(lt(notifications.createdAt, options.cursor));
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnread(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.read, false),
        isNull(notifications.dismissedAt),
      ),
    );
  return row?.value ?? 0;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  dedupKey?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  const db = getPersistenceDb();
  if (input.dedupKey) {
    const existing = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, input.userId),
        eq(notifications.type, input.type),
        eq(notifications.dedupKey, input.dedupKey),
      ),
    });
    if (existing) return existing;
  }

  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ?? null,
      dedupKey: input.dedupKey ?? null,
      createdAt: Date.now(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create notification");
  }
  return row;
}

export async function markNotificationRead(
  clerkUserId: string,
  notificationId: string,
) {
  const { db, row } = await assertOwnedNotification(
    clerkUserId,
    notificationId,
  );
  if (row.read) return row;
  const [updated] = await db
    .update(notifications)
    .set({ read: true, readAt: Date.now() })
    .where(eq(notifications.id, row.id))
    .returning();
  return updated ?? row;
}

export async function markAllNotificationsRead(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const now = Date.now();
  const result = await db
    .update(notifications)
    .set({ read: true, readAt: now })
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.read, false),
        isNull(notifications.dismissedAt),
      ),
    )
    .returning();
  return { updatedCount: result.length };
}

export async function dismissNotification(
  clerkUserId: string,
  notificationId: string,
) {
  const { db, row } = await assertOwnedNotification(
    clerkUserId,
    notificationId,
  );
  const [updated] = await db
    .update(notifications)
    .set({ dismissedAt: Date.now() })
    .where(eq(notifications.id, row.id))
    .returning();
  return updated ?? row;
}
