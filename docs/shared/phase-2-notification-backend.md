# Phase 2: Notification Backend

**Duration**: 1-2 hours
**Dependencies**: Phase 1 (Schema Changes)
**Parallel Work**: Can run alongside Phase 4 and Phase 7

---

## Feature Context

### What We're Building

**Shared Conversations** enables users viewing a shared conversation (`/share/[shareId]`) to:
1. **Continue Privately** - Fork conversation into their own account
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

### Why Notifications?

When someone joins a collaborative conversation, the original creator needs to know. This phase builds a **global, reusable notification system** that:
- Notifies creator when someone joins their shared conversation
- Can be extended for other notification types (new messages, mentions, etc.)
- Uses Convex reactive queries for real-time updates
- Automatically cleans up old notifications

---

## Current State

### From Phase 1

The `notifications` table exists with schema:

```typescript
notifications: defineTable({
  userId: v.id("users"),
  type: v.string(),
  title: v.string(),
  message: v.string(),
  data: v.optional(v.object({
    conversationId: v.optional(v.id("conversations")),
    joinedUserId: v.optional(v.id("users")),
    joinedUserName: v.optional(v.string()),
  })),
  read: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "read"])
  .index("by_created", ["createdAt"]),
```

---

## Phase Goals

By the end of this phase:
1. ✅ `convex/notifications.ts` created with all queries/mutations
2. ✅ Cron job added for 30-day cleanup
3. ✅ Internal mutation for programmatic notification creation
4. ✅ All notification operations working

---

## Prerequisites

- [ ] Phase 1 complete (notifications table exists)
- [ ] Development environment running (`bun dev`)

---

## Step-by-Step Implementation

### Step 1: Create Notifications File

Create new file: `convex/notifications.ts`

```typescript
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================
// QUERIES
// ============================================

/**
 * Get count of unread notifications (for badge)
 */
export const getUnreadCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

/**
 * Get notifications list (paginated)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
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

// ============================================
// MUTATIONS
// ============================================

/**
 * Mark single notification as read
 */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (notification.userId !== user._id) {
      throw new Error("Unauthorized");
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
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    // Batch update all unread notifications
    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );

    return { updated: unread.length };
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
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (notification.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.notificationId);
  },
});

// ============================================
// INTERNAL MUTATIONS (for programmatic use)
// ============================================

/**
 * Create a notification (called from other mutations)
 *
 * Usage:
 * ```typescript
 * await ctx.runMutation(internal.notifications.create, {
 *   userId: creatorId,
 *   type: "collaboration_joined",
 *   title: "New collaborator",
 *   message: `${userName} joined "${conversationTitle}"`,
 *   data: { conversationId, joinedUserId, joinedUserName },
 * });
 * ```
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      conversationId: v.optional(v.id("conversations")),
      joinedUserId: v.optional(v.id("users")),
      joinedUserName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      data: args.data,
      read: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

/**
 * Cleanup notifications older than 30 days
 * Called by cron job daily
 */
export const cleanupOld = internalMutation({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Query notifications older than 30 days
    // Process in batches to avoid timeout
    const old = await ctx.db
      .query("notifications")
      .withIndex("by_created", (q) => q.lt("createdAt", thirtyDaysAgo))
      .take(500); // Batch size to stay within limits

    // Delete old notifications
    await Promise.all(old.map((n) => ctx.db.delete(n._id)));

    return { deleted: old.length };
  },
});
```

### Step 2: Add Cron Job

Open or create `convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ============================================
// NOTIFICATION CLEANUP
// ============================================

/**
 * Delete notifications older than 30 days
 * Runs daily at 3:00 AM UTC
 */
crons.daily(
  "cleanup-old-notifications",
  { hourUTC: 3, minuteUTC: 0 },
  internal.notifications.cleanupOld
);

export default crons;
```

**If `crons.ts` already exists**, just add the cron job to the existing file:

```typescript
// Add this cron job to existing crons.ts

crons.daily(
  "cleanup-old-notifications",
  { hourUTC: 3, minuteUTC: 0 },
  internal.notifications.cleanupOld
);
```

### Step 3: Export from Convex Index (if needed)

If your project has a `convex/index.ts` that re-exports modules, add:

```typescript
export * from "./notifications";
```

Usually not needed if using direct imports.

### Step 4: Update Internal API Types

The `internal.notifications.create` and `internal.notifications.cleanupOld` should auto-generate. If you see TypeScript errors, run:

```bash
bunx convex dev
```

This regenerates the `_generated/api.d.ts` file.

---

## Testing Checklist

### Query Tests (Manual via Convex Dashboard)

1. Open Convex Dashboard → Functions tab
2. Test `notifications:getUnreadCount`:
   - Should return `0` for new users

3. Test `notifications:list`:
   - Should return empty array initially

### Mutation Tests (Manual via Dashboard)

1. Create a test notification directly in the database:
   ```json
   {
     "userId": "<your-user-id>",
     "type": "test",
     "title": "Test Notification",
     "message": "This is a test",
     "read": false,
     "createdAt": 1702857600000
   }
   ```

2. Test `notifications:getUnreadCount`:
   - Should return `1`

3. Test `notifications:markRead`:
   - Pass the notification ID
   - Verify `read` becomes `true`

4. Test `notifications:dismiss`:
   - Create another test notification
   - Dismiss it
   - Verify it's deleted

5. Test `notifications:markAllRead`:
   - Create multiple unread notifications
   - Call `markAllRead`
   - Verify all are marked as read

### Cron Test

1. Check Convex Dashboard → Crons tab
2. Verify "cleanup-old-notifications" appears
3. Verify schedule: Daily at 3:00 AM UTC

---

## API Reference

### Queries

| Query | Args | Returns | Description |
|-------|------|---------|-------------|
| `getUnreadCount` | none | `number` | Count of unread notifications |
| `list` | `{ limit?: number }` | `Notification[]` | Paginated notification list |

### Mutations

| Mutation | Args | Returns | Description |
|----------|------|---------|-------------|
| `markRead` | `{ notificationId }` | void | Mark one as read |
| `markAllRead` | none | `{ updated: number }` | Mark all as read |
| `dismiss` | `{ notificationId }` | void | Delete notification |

### Internal Mutations

| Mutation | Args | Returns | Description |
|----------|------|---------|-------------|
| `create` | `{ userId, type, title, message, data? }` | `Id<"notifications">` | Create notification |
| `cleanupOld` | none | `{ deleted: number }` | Delete 30+ day old |

---

## Usage Examples

### Creating a Notification (from another mutation)

```typescript
// In convex/shares.ts (Phase 3)
import { internal } from "./_generated/api";

// Inside forkCollaborative mutation:
await ((ctx.runMutation as any)(
  // @ts-ignore - TypeScript recursion limit
  internal.notifications.create,
  {
    userId: originalOwnerId,
    type: "collaboration_joined",
    title: "New collaborator",
    message: `${joiningUser.name || "Someone"} joined "${conversationTitle}"`,
    data: {
      conversationId: newCollabId,
      joinedUserId: joiningUser._id,
      joinedUserName: joiningUser.name,
    },
  }
));
```

### Reading Notifications (React component - Phase 6)

```typescript
// In src/components/notifications/NotificationBell.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function NotificationBell() {
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const notifications = useQuery(api.notifications.list, { limit: 10 });
  const markRead = useMutation(api.notifications.markRead);
  const dismiss = useMutation(api.notifications.dismiss);

  // ... component logic
}
```

---

## Troubleshooting

### "Cannot find module internal.notifications"

**Cause**: Types not regenerated after creating file

**Solution**:
```bash
bunx convex dev
# Wait for "Convex functions ready!" message
```

### Cron job not appearing in dashboard

**Cause**: `crons.ts` not exporting default

**Solution**: Ensure file has:
```typescript
export default crons;
```

### "Unauthorized" error on mutations

**Cause**: `getCurrentUser` returning null

**Solution**:
1. Ensure user is authenticated (Clerk)
2. Check that auth is properly configured in Convex

### TypeScript depth errors on internal calls

**Cause**: Convex type system with many modules

**Solution**: Use the pattern from CLAUDE.md:
```typescript
await ((ctx.runMutation as any)(
  // @ts-ignore - TypeScript recursion limit
  internal.notifications.create,
  { ...args }
));
```

---

## Next Phases

After completing Phase 2, you can proceed to:

- **Phase 3**: Fork Mutations (uses `internal.notifications.create` to notify)
- **Phase 6**: Notification UI (uses all the queries/mutations from this phase)

---

## Summary

This phase creates the complete notification backend:

| Component | Description |
|-----------|-------------|
| `getUnreadCount` query | For badge count |
| `list` query | For notification popover |
| `markRead` mutation | Mark one as read |
| `markAllRead` mutation | Mark all as read |
| `dismiss` mutation | Delete notification |
| `create` internal | Programmatic creation |
| `cleanupOld` cron | 30-day auto-cleanup |

**Total time**: 1-2 hours (including testing)

**Next**: Proceed to Phase 3 (Fork Mutations) or Phase 6 (Notification UI)
