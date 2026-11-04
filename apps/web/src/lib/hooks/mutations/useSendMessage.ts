import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
import { type BlahChatCache, getActiveCache } from "@/lib/cache/db";
import {
  isDefinitiveRefusal,
  messageQueue,
  type ReplayableQueuedMessage,
} from "@/lib/offline/messageQueue";
import { queryKeys } from "@/lib/query/keys";
import type { OptimisticMessage } from "@/types/optimistic";

interface SendMessageArgs {
  conversationId: Id<"conversations">;
  content: string;
  modelId?: string;
  models?: string[];
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

interface SendContext {
  cache: BlahChatCache | null;
  queueId?: string;
}

const acceptedResult = (
  value: unknown,
): value is {
  conversationId: string;
  messageId: string;
  assistantMessageId: string;
} => {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.conversationId === "string" &&
    typeof result.messageId === "string" &&
    typeof result.assistantMessageId === "string"
  );
};

function markUnknownOutcome(error: unknown): Error & { queued: true } {
  const result =
    error instanceof Error ? error : new Error("Send outcome is unknown");
  try {
    Object.assign(result, { queued: true as const });
    return result as Error & { queued: true };
  } catch {
    return Object.assign(new Error(result.message), { queued: true as const });
  }
}

export function useSendMessage(
  onOptimisticUpdate?: (messages: OptimisticMessage[]) => void,
  conversationId?: Id<"conversations">,
  isIncognito?: boolean,
) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const cacheByRequestKey = useRef(new Map<string, BlahChatCache | null>());

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    let active = true;
    const handleOnline = async () => {
      const cache = getActiveCache();
      if (!active || !cache || getActiveCache() !== cache) return;
      const queueCount = await messageQueue.getCount(cache);
      if (!active || getActiveCache() !== cache || queueCount === 0) return;

      toast.info(
        `Processing ${queueCount} queued message${queueCount > 1 ? "s" : ""}...`,
      );

      try {
        const [legacy, replayable] = await Promise.all([
          messageQueue.processQueue(async (msg) => {
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
          }, cache),
          messageQueue.processReplayableQueue(async (msg) => {
            const response = await apiClient.post(
              `/api/v1/conversations/${msg.conversationId}/messages`,
              replayPayload(msg),
            );
            if (!acceptedResult(response))
              throw new Error("The send response did not confirm acceptance");
          }, cache),
        ]);

        if (
          active &&
          getActiveCache() === cache &&
          legacy === "complete" &&
          replayable === "complete"
        ) {
          toast.success("All queued messages sent");
        }
      } catch {
        if (active && getActiveCache() === cache)
          toast.error("Failed to process queued messages");
      }
    };

    window.addEventListener("online", handleOnline);
    if (navigator.onLine) void handleOnline();
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
    };
  }, [apiClient]);

  const mutation = useMutation<unknown, Error, SendMessageArgs, SendContext>({
    mutationFn: async (args) => {
      const cache = cacheByRequestKey.current.get(args.clientMessageId ?? "");
      if (!cache || getActiveCache() !== cache) {
        throw new Error("The active account changed before the send started.");
      }
      try {
        const response = await apiClient.post(
          `/api/v1/conversations/${args.conversationId}/messages`,
          args,
        );
        if (!acceptedResult(response))
          throw new Error("The send response did not confirm acceptance");
        return response;
      } catch (error) {
        if (isIncognito !== true && !isDefinitiveRefusal(error))
          throw markUnknownOutcome(error);
        throw error;
      }
    },

    onMutate: async (variables) => {
      const clientMessageId = variables.clientMessageId;
      if (!clientMessageId)
        throw new Error("A stable send request key could not be created.");
      if (isIncognito === undefined)
        throw new Error(
          "This conversation's privacy state is not available yet.",
        );
      if (conversationId && variables.conversationId !== conversationId)
        throw new Error(
          "The send target changed before the request was saved.",
        );

      const cache = getActiveCache();
      if (!cache) throw new Error("The signed-in offline cache is not ready.");
      let queueId: string | undefined;
      if (!isIncognito) {
        const queued = await messageQueue.enqueueReplayable(
          replayPayload({ ...variables, clientMessageId }),
          cache,
        );
        if (!queued)
          throw new Error("The send could not be saved for safe recovery.");
        queueId = queued.id;
      }
      cacheByRequestKey.current.set(clientMessageId, cache);
      if (getActiveCache() !== cache)
        throw markUnknownOutcome(
          new Error("Account changed while preparing the send."),
        );

      const optimisticUserMsg: OptimisticMessage = {
        _id: `temp-user-${crypto.randomUUID()}` as `temp-${string}`,
        conversationId: variables.conversationId,
        userId: user?._id,
        role: "user",
        content: variables.content,
        clientMessageId,
        status: "optimistic",
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
      onOptimisticUpdate?.([optimisticUserMsg]);
      return { cache, queueId };
    },

    onSuccess: async (_data, variables, context) => {
      cacheByRequestKey.current.delete(variables.clientMessageId ?? "");
      if (context?.queueId)
        await messageQueue.acknowledgeReplayable(
          context.queueId,
          context.cache,
        );
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.conversationId),
      });
      analytics.track("message_sent", {
        model: variables.models
          ? variables.models.join(",")
          : (variables.modelId ?? "unknown"),
        hasAttachments: !!variables.attachments?.length,
      });
    },

    onError: async (error, variables, context) => {
      cacheByRequestKey.current.delete(variables.clientMessageId ?? "");
      if (
        context?.queueId &&
        context.cache &&
        getActiveCache() === context.cache
      ) {
        if (isDefinitiveRefusal(error)) {
          await messageQueue.acknowledgeReplayable(
            context.queueId,
            context.cache,
          );
        } else {
          toast.info(
            "Send outcome unknown. The original request is saved to retry safely.",
          );
        }
      }
      if (!(error as Error & { queued?: boolean })?.queued) {
        toast.error(error.message || "Failed to send message");
      }
    },
  });

  const withRequestKey = (args: SendMessageArgs): SendMessageArgs => ({
    ...args,
    clientMessageId: args.clientMessageId ?? `client-${crypto.randomUUID()}`,
  });

  return {
    ...mutation,
    mutate: (
      args: SendMessageArgs,
      options?: Parameters<typeof mutation.mutate>[1],
    ) => mutation.mutate(withRequestKey(args), options),
    mutateAsync: (
      args: SendMessageArgs,
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => mutation.mutateAsync(withRequestKey(args), options),
  };
}

function replayPayload(
  message: Pick<
    ReplayableQueuedMessage,
    | "conversationId"
    | "content"
    | "modelId"
    | "models"
    | "clientMessageId"
    | "thinkingEffort"
    | "attachments"
  >,
) {
  return {
    conversationId: message.conversationId,
    content: message.content,
    modelId: message.modelId,
    models: message.models,
    clientMessageId: message.clientMessageId,
    thinkingEffort: message.thinkingEffort,
    attachments: message.attachments,
  };
}
