import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/userSync";

/**
 * Get unread notification count for badge
 */
export const getUnreadCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .collect();

    return unread.length;
  },
});

/**
 * Get all notifications (paginated)
 */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);

    return notifications;
  },
});

/**
 * Mark single notification as read
 */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Not found");
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

/**
 * Mark all notifications as read
 */
export const markAllRead = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});

/**
 * Dismiss (delete) a notification
 */
export const dismiss = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Not found");
    }

    await ctx.db.delete(args.notificationId);
  },
});

/**
 * Internal: Create notification (called from other mutations)
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(
      v.object({
        conversationId: v.optional(v.id("conversations")),
        joinedUserId: v.optional(v.id("users")),
        joinedUserName: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      data: args.data,
      read: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal: Cleanup notifications older than 30 days
 */
export const cleanupOld = internalMutation({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Get old notifications using the by_created index
    const old = await ctx.db
      .query("notifications")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .take(500); // Batch size to avoid timeout

    for (const notification of old) {
      await ctx.db.delete(notification._id);
    }

    return { deleted: old.length };
  },
});
