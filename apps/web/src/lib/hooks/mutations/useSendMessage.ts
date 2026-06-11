import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useNotificationChimes } from "@/hooks/useNotificationChimes";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
import { messageQueue } from "@/lib/offline/messageQueue";
import { queryKeys } from "@/lib/query/keys";
import type { OptimisticMessage } from "@/types/optimistic";

type GenerationRequestResponse = {
  conversationId?: string;
  requestId?: string;
  streamUrl?: string;
  assistantMessageId?: string;
  assistantMessageIds?: string[];
  assistantModelId?: string;
  modelIds?: string[];
};

function dispatchGenerationStartedEvent(
  conversationId: string,
  data: GenerationRequestResponse | undefined,
) {
  if (!data?.requestId || !data.streamUrl) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("generation-request-started", {
      detail: {
        conversationId: data.conversationId ?? conversationId,
        requestId: data.requestId,
        streamUrl: data.streamUrl,
        assistantMessageId: data.assistantMessageId,
        assistantMessageIds: data.assistantMessageIds,
        assistantModelId: data.assistantModelId,
        modelIds: data.modelIds,
      },
    }),
  );
}

interface SendMessageArgs {
  conversationId: string;
  content: string;
  modelId?: string;
  models?: string[];
  parentMessageId?: string;
  clientMessageId?: string;
  thinkingEffort?: "none" | "low" | "medium" | "high";
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
  const { play: playNotificationChime } = useNotificationChimes();

  // Auto-process offline queue when connection restored
  useEffect(() => {
    const handleOnline = async () => {
      const queueCount = await messageQueue.getCount();
      if (queueCount === 0) return;

      toast.info(
        `Processing ${queueCount} queued message${queueCount > 1 ? "s" : ""}...`,
      );

      const { failed } = await messageQueue.processQueue(async (msg) => {
        // Send queued message
        const response = await apiClient.post<GenerationRequestResponse>(
          `/api/v1/conversations/${msg.conversationId}/messages`,
          {
            conversationId: msg.conversationId,
            content: msg.content,
            modelId: msg.modelId,
            models: msg.models,
            parentMessageId: msg.parentMessageId,
            clientMessageId: msg.clientMessageId,
            thinkingEffort: msg.thinkingEffort,
            attachments: msg.attachments,
          },
        );
        dispatchGenerationStartedEvent(msg.conversationId, response);
      });

      if (failed.length > 0) {
        toast.error(
          `${failed.length} queued message${failed.length > 1 ? "s" : ""} could not be sent and ${failed.length > 1 ? "were" : "was"} discarded`,
          {
            description: failed
              .map((msg) => `"${msg.content.slice(0, 60)}"`)
              .join(", "),
          },
        );
      } else {
        toast.success("All queued messages sent");
      }
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

    onMutate: (variables) => {
      const clientMessageId =
        variables.clientMessageId ??
        `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      // Create optimistic user message
      const optimisticUserMsg: OptimisticMessage = {
        _id: `temp-user-${Date.now()}` as `temp-${string}`,
        conversationId: variables.conversationId,
        role: "user" as const,
        content: variables.content,
        clientMessageId,
        status: "optimistic" as const,
        attachments: variables.attachments?.map((att) => ({
          id: att.storageId,
          type: att.type,
          name: att.name,
          storageId: att.storageId,
          mimeType: att.mimeType,
          size: att.size,
          _optimistic: true,
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _creationTime: Date.now(),
        _optimistic: true,
      };

      // Server creates assistant messages synchronously on the server
      // Only user message needs optimistic update for instant feedback
      onOptimisticUpdate?.([optimisticUserMsg]);

      return {
        optimisticIds: [optimisticUserMsg._id],
      };
    },

    onSuccess: (data, variables) => {
      // Server confirmed - REST query will update with real messages
      // Deduplication happens automatically in useOptimistic merge
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.conversationId),
      });

      dispatchGenerationStartedEvent(
        variables.conversationId,
        data as GenerationRequestResponse | undefined,
      );
      playNotificationChime("messageSent");

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
          parentMessageId: variables.parentMessageId,
          clientMessageId: variables.clientMessageId,
          thinkingEffort: variables.thinkingEffort,
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
