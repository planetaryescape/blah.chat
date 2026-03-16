"use client";

import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
import { useRegenerateMessage } from "@/lib/hooks/mutations/useRegenerateMessage";
import { useCachedSiblings } from "./useCacheSync";

export interface SiblingWithDuration extends Doc<"messages"> {
  generationDuration: number | null;
}

interface UseBranchComparisonOptions {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
}

interface UseBranchComparisonReturn {
  siblings: SiblingWithDuration[];
  currentIndex: number;
  isLoading: boolean;
  switchToBranch: (targetId: Id<"messages">) => Promise<void>;
  regenerate: (messageId: Id<"messages">) => Promise<void>;
  copyContent: (content: string) => Promise<void>;
}

export function useBranchComparison({
  messageId,
  conversationId,
}: UseBranchComparisonOptions): UseBranchComparisonReturn {
  const apiClient = useApiClient();
  const cachedSiblings = useCachedSiblings(messageId);
  const regenerateMutation = useRegenerateMessage();
  const rawSiblings = cachedSiblings ?? [];

  // Add generation duration to each sibling
  const siblings = useMemo<SiblingWithDuration[]>(() => {
    return rawSiblings.map((s) => ({
      ...s,
      generationDuration:
        s.generationCompletedAt && s.createdAt
          ? s.generationCompletedAt - s.createdAt
          : null,
    }));
  }, [rawSiblings]);

  // Find current sibling index
  const currentIndex = useMemo(() => {
    const idx = siblings.findIndex((s) => s._id === messageId);
    return idx >= 0 ? idx : 0;
  }, [siblings, messageId]);

  const switchToBranch = useCallback(
    async (targetId: Id<"messages">) => {
      try {
        await apiClient.post(
          `/api/v1/conversations/${conversationId}/switch-branch`,
          {
            targetMessageId: targetId,
          },
        );
        analytics.track("branch_switched", {
          conversationId,
          fromMessageId: messageId,
          toMessageId: targetId,
        });
      } catch (error) {
        console.error("Failed to switch branch:", error);
        toast.error("Failed to switch branch");
      }
    },
    [apiClient, conversationId, messageId],
  );

  const regenerate = useCallback(
    async (msgId: Id<"messages">) => {
      try {
        await regenerateMutation.mutateAsync({
          messageId: msgId,
          conversationId,
        });
        toast.success("Regenerating response...");
        analytics.track("message_regenerated", {
          conversationId,
          messageId: msgId,
        });
      } catch (error) {
        console.error("Failed to regenerate:", error);
        toast.error("Failed to regenerate response");
      }
    },
    [conversationId, regenerateMutation],
  );

  const copyContent = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
      analytics.track("content_copied", { source: "branch_comparison" });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  return {
    siblings,
    currentIndex,
    isLoading: cachedSiblings === undefined,
    switchToBranch,
    regenerate,
    copyContent,
  };
}
