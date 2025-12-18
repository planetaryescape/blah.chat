"use client";

import { useMutation, useQuery } from "convex/react";
import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const notifications = useQuery(api.notifications.list, { limit: 10 });
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const dismiss = useMutation(api.notifications.dismiss);

  const handleNotificationClick = async (
    notification: NonNullable<typeof notifications>[number],
  ) => {
    if (!notification.read) {
      await markRead({ notificationId: notification._id });
    }

    if (notification.data?.conversationId) {
      router.push(`/chat/${notification.data.conversationId}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount! > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {(unreadCount ?? 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead()}
              className="text-xs h-7"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors",
                  !n.read && "bg-primary/5",
                )}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {n.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss({ notificationId: n._id });
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
