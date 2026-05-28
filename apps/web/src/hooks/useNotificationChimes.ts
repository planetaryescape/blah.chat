"use client";

import {
  DEFAULT_NOTIFICATION_CHIME_SOUNDS,
  type NotificationChimeEvent,
  type NotificationChimeSounds,
} from "@blah-chat/shared/preferences";
import { useCallback, useMemo } from "react";
import { useUserPreference } from "@/hooks/useUserPreference";
import {
  playNotificationChime,
  resolveNotificationChime,
} from "@/lib/audio/notificationChimes";

export function useNotificationChimes() {
  const enabled = useUserPreference("notificationChimesEnabled");
  const selectedSounds = useUserPreference("notificationChimeSounds");

  const sounds = useMemo<NotificationChimeSounds>(
    () => ({
      ...DEFAULT_NOTIFICATION_CHIME_SOUNDS,
      ...(selectedSounds as Partial<NotificationChimeSounds>),
    }),
    [selectedSounds],
  );

  const play = useCallback(
    (event: NotificationChimeEvent) => {
      const chime = resolveNotificationChime(event, enabled, sounds);
      if (!chime) {
        return;
      }

      playNotificationChime(chime);
    },
    [enabled, sounds],
  );

  return {
    play,
    isEnabled: enabled,
    sounds,
  };
}
