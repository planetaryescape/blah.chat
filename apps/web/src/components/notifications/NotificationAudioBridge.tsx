"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNotificationChimes } from "@/hooks/useNotificationChimes";
import type { NotificationChimeEvent } from "@/lib/audio/notificationChimes";

interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: { chimeEvent?: NotificationChimeEvent } | null;
  read: boolean;
  createdAt: number;
}

async function fetchLatestUnreadNotification(): Promise<NotificationDTO | null> {
  const res = await fetch("/api/v1/notifications?limit=1&unreadOnly=true");
  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  const [item] = (json.data ?? []) as { data: NotificationDTO }[];
  return item?.data ?? null;
}

export function notificationToChimeEvent(
  notification: NotificationDTO,
): NotificationChimeEvent {
  if (notification.data?.chimeEvent) {
    return notification.data.chimeEvent;
  }

  switch (notification.type) {
    case "email_received":
      return "emailReceived";
    case "email_sent":
      return "emailSent";
    case "email_archived":
      return "emailArchived";
    default:
      return "notification";
  }
}

export function NotificationAudioBridge() {
  const { play } = useNotificationChimes();
  const latestQuery = useQuery({
    queryKey: ["notifications", "latest-unread"],
    queryFn: fetchLatestUnreadNotification,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    retry: false,
  });
  const baselineCaptured = useRef(false);
  const lastNotificationId = useRef<string | null>(null);

  useEffect(() => {
    if (!latestQuery.isFetched && latestQuery.status !== "success") {
      return;
    }

    const notification = latestQuery.data ?? null;
    if (!baselineCaptured.current) {
      baselineCaptured.current = true;
      lastNotificationId.current = notification?.id ?? null;
      return;
    }

    if (!notification || notification.id === lastNotificationId.current) {
      return;
    }

    lastNotificationId.current = notification.id;
    play(notificationToChimeEvent(notification));
  }, [latestQuery, play]);

  return null;
}
