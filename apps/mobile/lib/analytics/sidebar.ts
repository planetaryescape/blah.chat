import { useAuth } from "@clerk/clerk-expo";
import { useCallback } from "react";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

type SidebarEvent =
  | "sidebar_open"
  | "sidebar_search"
  | "sidebar_select_conversation"
  | "sidebar_action";

export function useSidebarAnalytics() {
  const { getToken } = useAuth();

  return useCallback(
    (
      event: SidebarEvent,
      metadata?: Record<string, unknown>,
      resourceId?: string,
    ) => {
      const client = createMobileSdkClient(() => getToken());
      void client.trackSidebarEvent(event, metadata, resourceId).catch(() => {
        // Best effort only. Analytics should never affect drawer behavior.
      });
    },
    [getToken],
  );
}
