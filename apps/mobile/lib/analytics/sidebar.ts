import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/lib/convex";

type SidebarEvent =
  | "sidebar_open"
  | "sidebar_search"
  | "sidebar_select_conversation"
  | "sidebar_action";

export function useSidebarAnalytics() {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const recordAction = useMutation(api.usage.mutations.recordAction);

  return useCallback(
    (
      event: SidebarEvent,
      metadata?: Record<string, unknown>,
      resourceId?: string,
    ) => {
      void recordAction({
        actionType: event,
        resourceId,
        metadata,
      }).catch(() => {
        // best-effort analytics
      });
    },
    [recordAction],
  );
}
