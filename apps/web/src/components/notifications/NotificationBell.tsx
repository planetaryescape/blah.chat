"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface NotificationDTO {
  _id: string;
  id: string;
  type: string;
  title: string;
  message: string;
  data?: { conversationId?: string; href?: string } | null;
  read: boolean;
  createdAt: number;
}

async function fetchNotifications(): Promise<NotificationDTO[]> {
  const res = await fetch("/api/v1/notifications");
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const json = await res.json();
  const items: { data: NotificationDTO }[] = json.data ?? [];
  return items.map((item) => item.data);
}

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/v1/notifications/count");
  if (!res.ok) return 0;
  const json = await res.json();
  return json.data?.unreadCount ?? 0;
}

async function patchMarkRead(notificationId: string) {
  await fetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
}

async function deleteDismiss(notificationId: string) {
  await fetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}`, {
    method: "DELETE",
  });
}

async function postMarkAllRead() {
  await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
}

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    retry: false,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: fetchNotifications,
    enabled: open,
    staleTime: 30_000,
    retry: false,
  });

  const invalidateNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markReadMutation = useMutation({
    mutationFn: patchMarkRead,
    onSuccess: invalidateNotifications,
  });

  const dismissMutation = useMutation({
    mutationFn: deleteDismiss,
    onSuccess: invalidateNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: postMarkAllRead,
    onSuccess: invalidateNotifications,
  });

  const handleNotificationClick = (notification: NotificationDTO) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.data?.conversationId) {
      router.push(`/chat/${notification.data.conversationId}`);
    } else if (notification.data?.href) {
      router.push(notification.data.href);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                markAllReadMutation.mutate();
              }}
              className="text-xs h-7"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "group flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors",
                  !n.read && "bg-primary/5",
                )}
                onClick={() => {
                  handleNotificationClick(n);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNotificationClick(n);
                  }
                }}
              >
                <div className="mt-1.5 flex-shrink-0">
                  {!n.read ? (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <div className="h-2 w-2" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissMutation.mutate(n.id);
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
