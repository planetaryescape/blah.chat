import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { analytics } from "@/lib/analytics";
import { queryKeys } from "@/lib/query/keys";
import type { Id } from "@/convex/_generated/dataModel";
import type { OptimisticMessage } from "@/types/optimistic";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { messageQueue } from "@/lib/offline/messageQueue";
import { useEffect } from "react";

interface SendMessageArgs {
  conversationId: Id<"conversations">;
  content: string;
  modelId?: string;
  models?: string[];
  thinkingEffort?: "low" | "medium" | "high";
  attachments?: Array<{
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
  }>;
}

export function useSendMessage(
  onOptimisticUpdate?: (messages: OptimisticMessage[]) => void,
) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);

  // Auto-process offline queue when connection restored
  useEffect(() => {
    const handleOnline = async () => {
      const queueCount = messageQueue.getCount();
      if (queueCount === 0) return;

      toast.info(
        `Processing ${queueCount} queued message${queueCount > 1 ? "s" : ""}...`,
      );

      await messageQueue.processQueue(async (msg) => {
        // Send queued message
        await apiClient.post(
          `/api/v1/conversations/${msg.conversationId}/messages`,
          {
            conversationId: msg.conversationId,
            content: msg.content,
            modelId: msg.modelId,
            models: msg.models,
            attachments: msg.attachments,
          },
        );
      });

      toast.success("All queued messages sent");
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [apiClient]);

  return useMutation({
    mutationFn: async (args: SendMessageArgs) => {
      return apiClient.post(
        `/api/v1/conversations/${args.conversationId}/messages`,
        args,
      );
    },

    onMutate: async (variables) => {
      // Create optimistic user message
      const optimisticUserMsg: OptimisticMessage = {
        _id: `temp-user-${Date.now()}` as `temp-${string}`,
        conversationId: variables.conversationId,
        userId: user?._id,
        role: "user" as const,
        content: variables.content,
        status: "optimistic" as const,
        attachments: variables.attachments?.map((att) => ({
          id: att.storageId,
          storageId: att.storageId as Id<"_storage">,
          _optimistic: true,
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _creationTime: Date.now(),
        _optimistic: true,
      };

      // Create optimistic assistant message(s) for comparison mode
      const models = variables.models || [variables.modelId];
      const optimisticAssistantMsgs: OptimisticMessage[] = models
        .filter((m): m is string => !!m)
        .map((modelId, idx) => ({
          _id: `temp-assistant-${Date.now()}-${idx}` as `temp-${string}`,
          conversationId: variables.conversationId,
          userId: user?._id,
          role: "assistant" as const,
          content: "",
          status: "pending" as const,
          model: modelId,
          comparisonGroupId:
            models.length > 1 ? `temp-comparison-${Date.now()}` : undefined,
          createdAt: Date.now() + idx + 1,
          updatedAt: Date.now() + idx + 1,
          _creationTime: Date.now() + idx + 1,
          _optimistic: true,
        }));

      // Add to optimistic state
      onOptimisticUpdate?.([optimisticUserMsg, ...optimisticAssistantMsgs]);

      return {
        optimisticIds: [
          optimisticUserMsg._id,
          ...optimisticAssistantMsgs.map((m) => m._id),
        ],
      };
    },

    onSuccess: (_data, variables) => {
      // Server confirmed - Convex query will update with real messages
      // Deduplication happens automatically in useOptimistic merge
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.conversationId),
      });

      // Track analytics
      analytics.track("message_sent", {
        model: variables.models
          ? variables.models.join(",")
          : (variables.modelId ?? "unknown"),
        hasAttachments: !!variables.attachments?.length,
      });
    },

    onError: (error, variables, _context) => {
      const msg =
        error instanceof Error ? error.message : "Failed to send message";

      // Check if offline - queue for retry
      if (!navigator.onLine) {
        messageQueue.enqueue({
          conversationId: variables.conversationId,
          content: variables.content,
          modelId: variables.modelId,
          models: variables.models,
          attachments: variables.attachments,
        });

        toast.info(
          "You're offline. Message queued and will send when reconnected.",
        );
      } else {
        // Online but failed - show error
        toast.error(msg);
      }

      // Optimistic messages will be cleaned up on next server update
      // (deduplication logic in chat page removes unconfirmed optimistic messages)
    },
  });
}
