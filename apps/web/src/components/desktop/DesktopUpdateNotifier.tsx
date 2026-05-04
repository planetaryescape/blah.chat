"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAsyncAction } from "@/hooks/useAsyncAction";
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
  const { run: install, isPending: installing } = useAsyncAction(
    async () => {
      const started = await installDesktopUpdate();
      if (!started) {
        toast.info("No update available");
        return;
      }
      toast.success("Installing update and restarting...");
    },
    {
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to install update";
        toast.error(message);
      },
    },
  );
  const installingRef = useRef(installing);
  installingRef.current = installing;

  useEffect(() => {
    if (!isDesktopShell()) return;

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const triggerInstall = () => {
      if (installingRef.current) return;
      void install();
    };

    const start = async () => {
      const off = await listenDesktopEvent<DesktopUpdateInfo>(
        "desktop://update-available",
        (update) => {
          if (cancelled) return;
          updateToast(update, triggerInstall);
        },
      );
      if (!cancelled) {
        unlisten = off;
      }

      const status = await checkDesktopUpdate(false);
      if (cancelled || !status.available || !status.update) return;
      updateToast(status.update, triggerInstall);
    };

    void start();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [install]);

  return null;
}
