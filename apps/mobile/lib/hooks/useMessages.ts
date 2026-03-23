import type { GenerationStreamEvent } from "@blah-chat/api-client";
import { useAuth } from "@clerk/clerk-expo";
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
} from "@tanstack/react-query";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import type { Doc, Id } from "@/lib/convex";
import { api } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { shouldUseConvexTransport } from "@/lib/transport/mode";

type Message = Doc<"messages">;

function sortMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }

    const aSibling = typeof a.siblingIndex === "number" ? a.siblingIndex : 0;
    const bSibling = typeof b.siblingIndex === "number" ? b.siblingIndex : 0;
    if (aSibling !== bSibling) {
      return aSibling - bSibling;
    }

    return String(a._id).localeCompare(String(b._id));
  });
}

function applyGenerationEventToMessages(
  messages: Message[],
  conversationId: Id<"conversations">,
  event: GenerationStreamEvent,
) {
  const index = messages.findIndex(
    (message) => String(message._id) === event.assistantMessageId,
  );
  const existing = index === -1 ? undefined : messages[index];
  const base =
    existing ??
    ({
      _id: event.assistantMessageId as Id<"messages">,
      _creationTime: event.ts,
      conversationId,
      userId: "assistant" as Id<"users">,
      role: "assistant",
      content: "",
      status: "pending",
      model: event.modelId,
      createdAt: event.ts,
      updatedAt: event.ts,
      siblingIndex: 0,
      isActiveBranch: true,
    } satisfies Message);
  const currentContent = base.partialContent ?? base.content;

  let nextMessage: Message = {
    ...base,
    model: event.modelId,
    updatedAt: event.ts,
  };

  switch (event.type) {
    case "start":
      nextMessage = {
        ...nextMessage,
        status: "generating",
        partialContent: currentContent || undefined,
      };
      break;
    case "delta": {
      const nextContent = `${currentContent}${event.delta ?? ""}`;
      nextMessage = {
        ...nextMessage,
        content: nextContent,
        partialContent: nextContent,
        status: "generating",
      };
      break;
    }
    case "checkpoint":
      nextMessage = {
        ...nextMessage,
        content: event.content ?? currentContent,
        partialContent: event.content ?? currentContent,
        status: "generating",
      };
      break;
    case "complete":
      nextMessage = {
        ...nextMessage,
        content: event.content ?? currentContent,
        partialContent: undefined,
        status: "complete",
      };
      break;
    case "cancelled":
      nextMessage = {
        ...nextMessage,
        status: "stopped",
        partialContent: undefined,
      };
      break;
    case "error":
      nextMessage = {
        ...nextMessage,
        status: "error",
        partialContent: undefined,
      };
      break;
  }

  const nextMessages = [...messages];
  if (index === -1) {
    nextMessages.push(nextMessage);
  } else {
    nextMessages[index] = nextMessage;
  }

  return sortMessages(nextMessages);
}

function isTerminalGenerationEvent(event: GenerationStreamEvent) {
  return (
    event.type === "complete" ||
    event.type === "cancelled" ||
    event.type === "error"
  );
}

export function useMessages(conversationId: Id<"conversations"> | null) {
  const useConvexMode = shouldUseConvexTransport();
  const { getToken } = useAuth();
  const [usePollingFallback, setUsePollingFallback] = useState(false);

  const convexMessages = useConvexQuery(
    api.messages.list,
    useConvexMode && conversationId ? { conversationId } : "skip",
  ) as Message[] | undefined;

  const activeGenerationQuery = useTanstackQuery({
    queryKey: ["mobile", "active-generation", conversationId],
    enabled: !useConvexMode && !!conversationId,
    staleTime: 0,
    queryFn: async () => {
      if (!conversationId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      return client.getActiveGeneration(conversationId);
    },
  });

  const httpQuery = useTanstackQuery({
    queryKey: ["mobile", "messages", conversationId],
    enabled: !useConvexMode && !!conversationId,
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
    if (useConvexMode || !conversationId) {
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
  }, [activeGenerationQuery.data, conversationId, getToken, useConvexMode]);

  const allMessages = useConvexMode
    ? convexMessages
    : (httpQuery.data as Message[] | undefined);

  return useMemo(() => {
    if (!allMessages) return allMessages;
    return allMessages.filter((m: Message) => m.isActiveBranch !== false);
  }, [allMessages]);
}

export function useSendMessage() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.chat.sendMessage);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: {
      conversationId: Id<"conversations">;
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
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.sendMessage(args.conversationId, {
        content: args.content,
        modelId: args.modelId,
        models: args.models,
        parentMessageId: args.parentMessageId,
        clientMessageId: args.clientMessageId,
        thinkingEffort: args.thinkingEffort,
        attachments: args.attachments,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["mobile", "active-generation", variables.conversationId],
        {
          conversationId: data.conversationId,
          requestId: data.requestId,
          streamUrl: data.streamUrl,
          status: data.status,
        },
      );
      queryClient.invalidateQueries({
        queryKey: ["mobile", "messages", variables.conversationId],
      });
    },
  });

  if (useConvexMode) {
    return convexMutation;
  }

  return async (args: {
    conversationId: Id<"conversations">;
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
  }) => {
    return httpMutation.mutateAsync(args);
  };
}
