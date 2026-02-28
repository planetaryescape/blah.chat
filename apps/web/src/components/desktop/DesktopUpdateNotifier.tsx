"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  checkDesktopUpdate,
  type DesktopUpdateInfo,
  installDesktopUpdate,
  isDesktopShell,
  listenDesktopEvent,
} from "@/lib/desktop/ipc";

function updateToast(update: DesktopUpdateInfo, onInstall: () => void) {
  toast.info(`Update available: v${update.version}`, {
    description: "Install now and restart the desktop app.",
    duration: 15000,
    action: {
      label: "Update",
      onClick: onInstall,
    },
  });
}

export function DesktopUpdateNotifier() {
  const installingRef = useRef(false);

  useEffect(() => {
    if (!isDesktopShell()) return;

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const install = async () => {
      if (installingRef.current) return;
      installingRef.current = true;
      try {
        const started = await installDesktopUpdate();
        if (!started) {
          toast.info("No update available");
          return;
        }
        toast.success("Installing update and restarting...");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to install update";
        toast.error(message);
      } finally {
        installingRef.current = false;
      }
    };

    const start = async () => {
      const off = await listenDesktopEvent<DesktopUpdateInfo>(
        "desktop://update-available",
        (update) => {
          if (cancelled) return;
          updateToast(update, () => void install());
        },
      );
      if (!cancelled) {
        unlisten = off;
      }

      const status = await checkDesktopUpdate(false);
      if (cancelled || !status.available || !status.update) return;
      updateToast(status.update, () => void install());
    };

    void start();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return null;
}
