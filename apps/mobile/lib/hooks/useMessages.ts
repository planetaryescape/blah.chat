import { useAuth } from "@clerk/clerk-expo";
import { onlineManager, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import {
  insertConversationIntoCache,
  reconcileConversationInCache,
} from "@/lib/chat/conversationCache";
import {
  addPendingMessagePair,
  applyGenerationEventToMessages,
  filterActiveBranchMessages,
} from "@/lib/chat/messageTree";
import type { Doc, Id } from "@/lib/convex";
import { mobileMessageQueue } from "@/lib/offline/messageQueue";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

type Message = Doc<"messages">;

const LOCAL_CONVERSATION_PREFIX = "local_conv_";

function isTerminalGenerationEvent(event: { type: string }) {
  return (
    event.type === "complete" ||
    event.type === "cancelled" ||
    event.type === "error"
  );
}

function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isLocalConversationId(conversationId: string | null | undefined) {
  return (
    !!conversationId && conversationId.startsWith(LOCAL_CONVERSATION_PREFIX)
  );
}

function shouldQueueSendError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  );
}

export function createLocalConversationId() {
  return `${LOCAL_CONVERSATION_PREFIX}${createClientMessageId()}` as Id<"conversations">;
}

export function useMessages(conversationId: Id<"conversations"> | null) {
  const { getToken } = useAuth();
  const [usePollingFallback, setUsePollingFallback] = useState(false);
  const isLocalConversation = isLocalConversationId(conversationId);

  const activeGenerationQuery = useQuery({
    queryKey: ["mobile", "active-generation", conversationId],
    enabled: !!conversationId && !isLocalConversation,
    staleTime: 0,
    queryFn: async () => {
      if (!conversationId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      return client.getActiveGeneration(conversationId);
    },
  });

  const messageTreeQuery = useQuery({
    queryKey: ["mobile", "messages", conversationId],
    enabled: !!conversationId && !isLocalConversation,
    staleTime: 2_000,
    refetchInterval:
      activeGenerationQuery.data?.requestId || !usePollingFallback
        ? false
        : 1_500,
    queryFn: async () => {
      if (!conversationId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      const messages = await client.listMessages(conversationId);
      return messages as Message[];
    },
  });

  useEffect(() => {
    if (!conversationId || isLocalConversation) {
      return;
    }

    const activeGeneration = activeGenerationQuery.data;
    if (!activeGeneration?.requestId) {
      return;
    }

    const requestId = activeGeneration.requestId;
    const client = createMobileSdkClient(() => getToken());
    const abortController = new AbortController();
    let cancelled = false;
    setUsePollingFallback(false);

    void (async () => {
      try {
        for await (const event of client.streamGeneration(requestId, {
          signal: abortController.signal,
        })) {
          if (event.event !== "generation") {
            continue;
          }

          queryClient.setQueryData<Message[] | null | undefined>(
            ["mobile", "messages", conversationId],
            (current) =>
              applyGenerationEventToMessages(
                current ?? [],
                conversationId,
                event.data,
              ),
          );

          if (!isTerminalGenerationEvent(event.data)) {
            continue;
          }

          queryClient.setQueryData(
            ["mobile", "active-generation", conversationId],
            {
              conversationId,
              requestId: null,
              streamUrl: null,
              status: event.data.type,
            },
          );
          await queryClient.invalidateQueries({
            queryKey: ["mobile", "messages", conversationId],
          });
          return;
        }
      } catch {
        if (cancelled || abortController.signal.aborted) {
          return;
        }

        setUsePollingFallback(true);
        await queryClient.invalidateQueries({
          queryKey: ["mobile", "messages", conversationId],
        });
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    activeGenerationQuery.data,
    conversationId,
    getToken,
    isLocalConversation,
  ]);

  return useMemo(
    () =>
      filterActiveBranchMessages(
        messageTreeQuery.data as Message[] | undefined,
      ),
    [messageTreeQuery.data],
  );
}

export function useMessageTree(conversationId: Id<"conversations"> | null) {
  const { getToken } = useAuth();
  const isLocalConversation = isLocalConversationId(conversationId);

  const query = useQuery({
    queryKey: ["mobile", "messages", conversationId],
    enabled: !!conversationId && !isLocalConversation,
    staleTime: 2_000,
    queryFn: async () => {
      if (!conversationId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      return (await client.listMessages(conversationId)) as Message[];
    },
  });

  return query.data as Message[] | undefined;
}

type SendMessageArgs = {
  conversationId?: Id<"conversations">;
  localConversationId?: Id<"conversations">;
  createConversation?: {
    model: string;
    title?: string;
    systemPrompt?: string;
  };
  content: string;
  modelId?: string;
  models?: string[];
  parentMessageId?: Id<"messages">;
  clientMessageId?: string;
  thinkingEffort?: "none" | "low" | "medium" | "high";
  attachments?: Array<{
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
  }>;
};

type QueuedSendResult = {
  queued: true;
  conversationId: Id<"conversations">;
  clientMessageId: string;
  requestId: null;
  streamUrl: null;
  status: "queued";
};

type SentSendResult = {
  queued: false;
  conversationId: string;
  clientMessageId: string;
  requestId: string;
  streamUrl: string;
  status: string;
};

type SendMessageResult = QueuedSendResult | SentSendResult;

export function useSendMessage() {
  const { getToken } = useAuth();

  const mutation = useMutation<SendMessageResult, Error, SendMessageArgs>({
    mutationFn: async (args: SendMessageArgs): Promise<SendMessageResult> => {
      const client = createMobileSdkClient(() => getToken());
      const clientMessageId = args.clientMessageId ?? createClientMessageId();
      const optimisticConversationId =
        args.conversationId ?? args.localConversationId;

      if (!optimisticConversationId) {
        throw new Error("conversationId or localConversationId is required");
      }

      const createdAt = Date.now();
      queryClient.setQueryData<Message[] | undefined>(
        ["mobile", "messages", optimisticConversationId],
        (current) =>
          addPendingMessagePair(current ?? [], {
            conversationId: optimisticConversationId,
            content: args.content,
            modelId: args.modelId,
            models: args.models,
            clientMessageId,
            createdAt,
          }),
      );

      const queueRecord = {
        conversationId: args.conversationId,
        localConversationId: args.localConversationId,
        createConversation: args.createConversation,
        content: args.content,
        modelId: args.modelId,
        models: args.models,
        parentMessageId: args.parentMessageId,
        clientMessageId,
        thinkingEffort: args.thinkingEffort,
        attachments: args.attachments,
        createdAt,
      };

      if (onlineManager.isOnline() === false) {
        mobileMessageQueue.enqueueSend(queueRecord);
        return {
          queued: true,
          conversationId: optimisticConversationId,
          clientMessageId,
          requestId: null,
          streamUrl: null,
          status: "queued",
        };
      }

      if (
        !args.conversationId &&
        args.localConversationId &&
        !args.createConversation
      ) {
        mobileMessageQueue.enqueueSend(queueRecord);
        return {
          queued: true,
          conversationId: optimisticConversationId,
          clientMessageId,
          requestId: null,
          streamUrl: null,
          status: "queued",
        };
      }

      try {
        let conversationId = args.conversationId;
        if (!conversationId && args.createConversation) {
          const createdConversation = await client.createConversation(
            args.createConversation,
          );
          conversationId = createdConversation._id as Id<"conversations">;
          insertConversationIntoCache(
            queryClient,
            createdConversation as unknown as Doc<"conversations">,
          );

          if (args.localConversationId) {
            reconcileConversationInCache(queryClient, {
              localConversationId: args.localConversationId,
              nextConversation:
                createdConversation as unknown as Doc<"conversations">,
            });
          }
        }

        if (!conversationId) {
          throw new Error("Conversation creation did not return an id");
        }

        const response = await client.sendMessage(conversationId, {
          content: args.content,
          modelId: args.modelId,
          models: args.models,
          parentMessageId: args.parentMessageId,
          clientMessageId,
          thinkingEffort: args.thinkingEffort,
          attachments: args.attachments,
        });

        return {
          ...response,
          queued: false,
          clientMessageId,
        };
      } catch (error) {
        if (!shouldQueueSendError(error)) {
          throw error;
        }

        mobileMessageQueue.enqueueSend(queueRecord);
        return {
          queued: true,
          conversationId: optimisticConversationId,
          clientMessageId,
          requestId: null,
          streamUrl: null,
          status: "queued",
        };
      }
    },
    onSuccess: async (data) => {
      if (data.queued) {
        return;
      }

      queryClient.setQueryData(
        ["mobile", "active-generation", data.conversationId],
        {
          conversationId: data.conversationId,
          requestId: data.requestId,
          streamUrl: data.streamUrl,
          status: data.status,
        },
      );
      await queryClient.invalidateQueries({
        queryKey: ["mobile", "messages", data.conversationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mobile", "conversations"],
      });
    },
  });

  return async (args: SendMessageArgs) => mutation.mutateAsync(args);
}
