# Phase 6: Notification UI

**Duration**: 1-2 hours
**Dependencies**: Phase 2 (Notification Backend)
**Parallel Work**: Can run after Phase 2, independent of Phases 3-5

---

## Feature Context

### What We're Building

**Shared Conversations** enables users viewing a shared conversation (`/share/[shareId]`) to:
1. **Continue Privately** - Fork conversation into their own account
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

### Why Notifications?

When someone joins a collaborative conversation, the original creator needs to know immediately. This phase builds the UI for the notification system:
- Bell icon in app header (opposite sidebar toggle)
- Red badge showing unread count
- Popover with notification list
- Click to navigate, mark as read, or dismiss

---

## Current State

### From Phase 2

Backend is ready:
- `api.notifications.getUnreadCount` - returns count
- `api.notifications.list` - returns notifications
- `api.notifications.markRead` - mark one as read
- `api.notifications.markAllRead` - mark all as read
- `api.notifications.dismiss` - delete notification

### Existing UI Patterns

The app header already has:
- Sidebar toggle button (left side)
- Other header elements (right side)

We're adding the notification bell on the right side, opposite the sidebar toggle.

---

## Phase Goals

By the end of this phase:
1. ✅ Bell icon visible in app header
2. ✅ Red badge shows unread count
3. ✅ Popover shows notification list
4. ✅ Click notification → navigate to conversation
5. ✅ Mark as read / dismiss actions work
6. ✅ Real-time updates via Convex

---

## Prerequisites

- [ ] Phase 2 complete (notification backend)
- [ ] Development environment running (`bun dev`)

---

## Step-by-Step Implementation

### Step 1: Create NotificationBell Component

Create new file: `src/components/notifications/NotificationBell.tsx`

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  _id: Id<"notifications">;
  type: string;
  title: string;
  message: string;
  data?: {
    conversationId?: Id<"conversations">;
    joinedUserId?: Id<"users">;
    joinedUserName?: string;
  };
  read: boolean;
  createdAt: number;
}

export function NotificationBell() {
  const router = useRouter();

  // Queries - real-time via Convex
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const notifications = useQuery(api.notifications.list, { limit: 10 });

  // Mutations
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const dismiss = useMutation(api.notifications.dismiss);

  /**
   * Handle notification click
   * - Mark as read
   * - Navigate to relevant page
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markRead({ notificationId: notification._id });
    }

    // Navigate based on notification type/data
    if (notification.data?.conversationId) {
      router.push(`/chat/${notification.data.conversationId}`);
    }
  };

  /**
   * Dismiss notification (delete)
   */
  const handleDismiss = async (
    e: React.MouseEvent,
    notificationId: Id<"notifications">
  ) => {
    e.stopPropagation(); // Prevent triggering click handler
    await dismiss({ notificationId });
  };

  // Loading state
  if (unreadCount === undefined) {
    return (
      <Button variant="ghost" size="icon" disabled className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead()}
              className="text-xs h-7 px-2"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications === undefined ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification as Notification}
                onClick={() => handleNotificationClick(notification as Notification)}
                onDismiss={(e) => handleDismiss(e, notification._id)}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Individual notification item
 */
function NotificationItem({
  notification,
  onClick,
  onDismiss,
}: {
  notification: Notification;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors",
        !notification.read && "bg-primary/5"
      )}
      onClick={onClick}
    >
      {/* Unread indicator */}
      <div className="mt-1.5 flex-shrink-0">
        {!notification.read && (
          <div className="h-2 w-2 rounded-full bg-primary" />
        )}
        {notification.read && <div className="h-2 w-2" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </p>
      </div>

      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
        onClick={onDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

### Step 2: Create Index Export

Create `src/components/notifications/index.ts`:

```typescript
export { NotificationBell } from "./NotificationBell";
```

### Step 3: Add to App Header

Find your main app layout header. This is likely in:
- `src/app/(main)/layout.tsx`
- `src/components/layout/Header.tsx`
- `src/components/header/AppHeader.tsx`

Add the NotificationBell:

```tsx
import { NotificationBell } from "@/components/notifications";

// In the header component, opposite the sidebar toggle:
<header className="...">
  <div className="flex items-center justify-between">
    {/* Left side: Sidebar toggle */}
    <div className="flex items-center gap-2">
      <SidebarToggle />
      {/* ... */}
    </div>

    {/* Right side: Notifications + other items */}
    <div className="flex items-center gap-2">
      <NotificationBell />
      <ThemeToggle />
      <UserButton />
    </div>
  </div>
</header>
```

### Step 4: Make Dismiss Button Visible on Hover

Update the notification item to show dismiss on hover:

```tsx
<div
  className={cn(
    "group flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors",
    !notification.read && "bg-primary/5"
  )}
  onClick={onClick}
>
  {/* ... */}

  {/* Dismiss button - visible on hover */}
  <Button
    variant="ghost"
    size="icon"
    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
    onClick={onDismiss}
  >
    <X className="h-3 w-3" />
  </Button>
</div>
```

### Step 5: Add Notification Type Icons (Optional Enhancement)

```tsx
import { Users, MessageSquare, Bell as BellIcon } from "lucide-react";

function getNotificationIcon(type: string) {
  switch (type) {
    case "collaboration_joined":
      return <Users className="h-4 w-4 text-blue-500" />;
    case "new_message":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    default:
      return <BellIcon className="h-4 w-4 text-muted-foreground" />;
  }
}

// Use in NotificationItem:
<div className="mt-0.5 flex-shrink-0">
  {getNotificationIcon(notification.type)}
</div>
```

### Step 6: Add Sound/Vibration (Optional)

For a premium feel, add sound when new notification arrives:

```tsx
import { useEffect, useRef } from "react";

export function NotificationBell() {
  const prevCountRef = useRef<number | undefined>(undefined);

  // Play sound on new notification
  useEffect(() => {
    if (
      unreadCount !== undefined &&
      prevCountRef.current !== undefined &&
      unreadCount > prevCountRef.current
    ) {
      // New notification arrived
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore if blocked
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // ... rest of component
}
```

---

## Testing Checklist

### Bell Icon Visibility

- [ ] Bell icon visible in header
- [ ] Positioned opposite sidebar toggle
- [ ] No badge when 0 unread
- [ ] Badge shows correct count (1-9)
- [ ] Badge shows "9+" for 10+ unread

### Popover Behavior

- [ ] Click bell opens popover
- [ ] Click outside closes popover
- [ ] Shows loading state initially
- [ ] Shows "No notifications" when empty
- [ ] Lists notifications (most recent first)

### Notification Display

- [ ] Title displayed correctly
- [ ] Message displayed (truncated if long)
- [ ] Timestamp shows relative time
- [ ] Unread has blue dot indicator
- [ ] Unread has subtle background color

### Actions

- [ ] Click notification → navigates to conversation
- [ ] Click notification → marks as read
- [ ] Hover shows dismiss button
- [ ] Click dismiss → removes notification
- [ ] "Mark all read" → clears all unread

### Real-Time Updates

- [ ] New notification appears immediately (Convex reactive)
- [ ] Badge count updates in real-time
- [ ] Mark as read updates across tabs

### Edge Cases

- [ ] Very long title/message (truncation)
- [ ] Many notifications (scrolling)
- [ ] Rapid notifications (no duplicates)
- [ ] Network error handling

---

## Troubleshooting

### Bell not showing

**Cause**: Component not imported or rendered

**Solution**:
1. Check import path is correct
2. Verify component is inside authenticated layout
3. Check for console errors

### Badge not updating

**Cause**: Query not reactive or auth issue

**Solution**:
1. Verify `useQuery` is from `convex/react`
2. Check user is authenticated
3. Confirm notifications exist in database

### Popover not opening

**Cause**: Missing Popover component or z-index issue

**Solution**:
1. Install shadcn popover: `bunx shadcn@latest add popover`
2. Check z-index of header vs popover
3. Ensure PopoverContent has correct styles

### Notifications not appearing

**Cause**: Internal mutation not being called

**Solution**:
1. Verify Phase 3 is complete (fork creates notification)
2. Check `internal.notifications.create` is called
3. Look for errors in Convex logs

### Click doesn't navigate

**Cause**: Missing conversationId in data

**Solution**:
1. Check notification data structure
2. Verify `data.conversationId` is populated
3. Ensure router.push path is correct

---

## Styling Variations

### Minimal Badge

```tsx
{unreadCount > 0 && (
  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
)}
```

### Animated Badge

```tsx
{unreadCount > 0 && (
  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center animate-pulse">
    {unreadCount}
  </span>
)}
```

### Floating Counter

```tsx
{unreadCount > 0 && (
  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-[11px] font-semibold text-white flex items-center justify-center shadow-lg">
    {unreadCount}
  </span>
)}
```

---

## Future Enhancements

### Notification Preferences

```tsx
// Settings page addition
const NotificationSettings = () => {
  return (
    <div>
      <Switch label="Collaboration notifications" />
      <Switch label="Sound" />
      <Switch label="Browser notifications" />
    </div>
  );
};
```

### Push Notifications

```tsx
// Request permission and send to service worker
const requestPushPermission = async () => {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    // Register service worker and get subscription
  }
};
```

### Notification Categories

```tsx
// Filter tabs in popover
<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">All</TabsTrigger>
    <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
    <TabsTrigger value="mentions">Mentions</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## Summary

This phase creates the notification UI:

| Component | Description |
|-----------|-------------|
| `NotificationBell` | Bell icon with badge |
| Badge | Red circle with unread count |
| Popover | Dropdown with notification list |
| NotificationItem | Individual notification display |
| Actions | Mark read, dismiss, navigate |

**Features**:
- Real-time updates via Convex
- Click to navigate
- Mark as read/dismiss
- Responsive design
- Accessible

**Total time**: 1-2 hours (including testing)

**Next**: Full feature testing with Phase 5 (Share Page UI)
