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
    const body = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch latest unread notification (${res.status} ${res.statusText})${
        body ? `: ${body}` : ""
      }`,
    );
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
  const lastLoggedError = useRef<unknown>(null);

  useEffect(() => {
    if (latestQuery.isError) {
      if (latestQuery.error !== lastLoggedError.current) {
        console.warn("Failed to poll latest unread notification", {
          error: latestQuery.error,
        });
        lastLoggedError.current = latestQuery.error;
      }
      return;
    }

    if (latestQuery.status !== "success") {
      return;
    }

    const notification = latestQuery.data ?? null;
    if (!notification) {
      return;
    }

    if (!baselineCaptured.current) {
      baselineCaptured.current = true;
      lastNotificationId.current = notification.id;
      return;
    }

    if (notification.id === lastNotificationId.current) {
      return;
    }

    lastNotificationId.current = notification.id;
    play(notificationToChimeEvent(notification));
  }, [
    latestQuery.data,
    latestQuery.error,
    latestQuery.isError,
    latestQuery.status,
    play,
  ]);

  return null;
}
