import "server-only";
import { z } from "zod";
import {
  countUnread,
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/persistence/notifications";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";

const listOptionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  cursor: z.coerce.number().int().optional(),
});

const updateNotificationSchema = z.object({
  read: z.literal(true),
});

export const notificationsDAL = {
  async list(clerkUserId: string, query: unknown) {
    const opts = listOptionsSchema.parse(query ?? {});
    const rows = await listNotifications(clerkUserId, opts);
    return formatEntityList(
      rows.map((row) => ({ ...row, _id: row.id })),
      "notification",
    );
  },

  async count(clerkUserId: string) {
    const value = await countUnread(clerkUserId);
    return formatEntity({ unreadCount: value }, "notification_count");
  },

  async markRead(
    clerkUserId: string,
    notificationId: string,
    payload: unknown,
  ) {
    updateNotificationSchema.parse(payload);
    const row = await markNotificationRead(clerkUserId, notificationId);
    return formatEntity({ ...row, _id: row.id }, "notification", row.id);
  },

  async dismiss(clerkUserId: string, notificationId: string) {
    const row = await dismissNotification(clerkUserId, notificationId);
    return formatEntity({ ...row, _id: row.id }, "notification", row.id);
  },

  async markAllRead(clerkUserId: string) {
    const result = await markAllNotificationsRead(clerkUserId);
    return formatEntity(result, "notification_bulk_update");
  },
};
