"use client";

import {
  type GenerationEvent,
  parseGenerationEvent,
} from "@blah-chat/streaming-core";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { cache } from "@/lib/cache";

type ApiMessage = {
  _id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  clientMessageId?: string;
  partialContent?: string;
  /** Transient ack text from a small fast model; cleared once real content streams in. Not persisted. */
  ackText?: string;
  status?: string;
  model?: string;
  comparisonGroupId?: string;
  consolidatedMessageId?: string;
  isConsolidation?: boolean;
  attachments?: Array<{
    id: string;
    type: "file" | "image" | "audio";
    storageId: string;
    name: string;
    mimeType: string;
    size: number;
    url?: string;
  }>;
  rootMessageId?: string;
  siblingIndex?: number;
  forkReason?: string;
  createdAt: number;
  updatedAt: number;
  _creationTime: number;
};

type MessageEnvelope = {
  data?: ApiMessage;
};

type MessageStreamPayload = {
  messages?: MessageEnvelope[];
};

type ActiveGenerationEnvelope = {
  data?: {
    requestId?: string | null;
    streamUrl?: string | null;
  };
};

type GenerationStartedDetail = {
  conversationId: string;
  requestId: string;
  streamUrl: string;
  assistantMessageId?: string;
  assistantMessageIds?: string[];
  assistantModelId?: string;
  modelIds?: string[];
};

interface MessageSyncOptions {
  conversationId: string | undefined;
}

const NOOP_LOAD_MORE = (_count?: number) => Promise.resolve();

function sortMessages(messages: ApiMessage[]) {
  return [...messages].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    const aSibling = typeof a.siblingIndex === "number" ? a.siblingIndex : 0;
    const bSibling = typeof b.siblingIndex === "number" ? b.siblingIndex : 0;
    if (aSibling !== bSibling) return aSibling - bSibling;
    return a._id.localeCompare(b._id);
  });
}

export function createPendingAssistantMessages(input: {
  assistantMessageId?: string;
  assistantMessageIds?: string[];
  assistantModelId?: string;
  conversationId: string;
  modelIds?: string[];
  ts?: number;
}) {
  const assistantMessageIds =
    input.assistantMessageIds && input.assistantMessageIds.length > 0
      ? input.assistantMessageIds
      : input.assistantMessageId
        ? [input.assistantMessageId]
        : [];
  const modelIds =
    input.modelIds && input.modelIds.length > 0
      ? input.modelIds
      : input.assistantModelId
        ? [input.assistantModelId]
        : [];
  const ts = input.ts ?? Date.now();

  return assistantMessageIds.map((assistantMessageId, index) => ({
    _id: assistantMessageId,
    conversationId: input.conversationId,
    role: "assistant" as const,
    content: "",
    partialContent: undefined,
    status: "pending",
    model: modelIds[index] ?? modelIds[0],
    createdAt: ts + index,
    updatedAt: ts + index,
    _creationTime: ts + index,
  }));
}

export function extractMessagesFromPayload(payload: unknown): ApiMessage[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) =>
      item && typeof item === "object" && "data" in item && item.data
        ? [item.data as ApiMessage]
        : [],
    );
  }

  if (payload && typeof payload === "object" && "messages" in payload) {
    const messages = (payload as MessageStreamPayload).messages ?? [];
    return messages.flatMap((item) => (item?.data ? [item.data] : []));
  }

  return [];
}

export function applyGenerationEventToMessages(
  messages: ApiMessage[],
  conversationId: string,
  event: GenerationEvent,
) {
  const index = messages.findIndex(
    (message) => message._id === event.assistantMessageId,
  );
  const shouldIgnoreUnknownNonTerminalEvent =
    index === -1 && (event.type === "start" || event.type === "ack");

  if (shouldIgnoreUnknownNonTerminalEvent) {
    return sortMessages(messages);
  }

  const existing = index === -1 ? undefined : messages[index];
  const base: ApiMessage = existing ?? {
    _id: event.assistantMessageId,
    conversationId,
    role: "assistant",
    content: "",
    status: "pending",
    model: event.modelId,
    createdAt: event.ts,
    updatedAt: event.ts,
    _creationTime: event.ts,
  };
  const currentContent = base.partialContent ?? base.content;

  let nextMessage: ApiMessage = {
    ...base,
    model: event.modelId,
    updatedAt: event.ts,
  };

  switch (event.type) {
    case "ack":
      // Late ack arrival when real content already streamed — drop it.
      if ((base.partialContent ?? base.content ?? "").length > 0) {
        return sortMessages(messages);
      }
      nextMessage = { ...nextMessage, ackText: event.text };
      break;
    case "start":
      nextMessage = {
        ...nextMessage,
        status: "generating",
        partialContent: currentContent || undefined,
      };
      break;
    case "delta": {
      const nextContent = `${currentContent}${event.delta}`;
      nextMessage = {
        ...nextMessage,
        content: nextContent,
        partialContent: nextContent,
        status: "generating",
        ackText: undefined,
      };
      break;
    }
    case "checkpoint":
      nextMessage = {
        ...nextMessage,
        content: event.content,
        partialContent: event.content,
        status: "generating",
        ackText: undefined,
      };
      break;
    case "complete":
      nextMessage = {
        ...nextMessage,
        content: event.content,
        partialContent: undefined,
        status: "complete",
        ackText: undefined,
      };
      break;
    case "cancelled":
      nextMessage = {
        ...nextMessage,
        status: "stopped",
        partialContent: undefined,
        ackText: undefined,
      };
      break;
    case "error":
      nextMessage = {
        ...nextMessage,
        status: "error",
        partialContent: undefined,
        ackText: undefined,
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

function isTerminalGenerationEvent(event: GenerationEvent) {
  return ["complete", "cancelled", "error"].includes(event.type);
}

async function syncConversationMessages(
  conversationId: string,
  messages: ApiMessage[],
) {
  const sorted = sortMessages(messages);
  const incomingIds = new Set(sorted.map((message) => message._id));
  const existing = await cache.messages
    .where("conversationId")
    .equals(conversationId)
    .toArray();

  const orphanIds = existing
    .filter((message) => !incomingIds.has(String(message._id)))
    .map((message) => message._id);

  if (orphanIds.length > 0) {
    await cache.messages.bulkDelete(orphanIds);
  }

  if (sorted.length > 0) {
    await cache.messages.bulkPut(sorted as any[]);
  }
}

async function syncGenerationEvent(
  conversationId: string,
  event: GenerationEvent,
) {
  const existing = await cache.messages
    .where("conversationId")
    .equals(conversationId)
    .toArray();
  const merged = applyGenerationEventToMessages(
    existing as unknown as ApiMessage[],
    conversationId,
    event,
  );
  await cache.messages.bulkPut(merged as any[]);
}

export function useRestMessageSync({ conversationId }: MessageSyncOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<
    "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted" | "Error"
  >("LoadingFirstPage");
  const previousConversationIdRef = useRef<string | undefined>(conversationId);

  const cachedMessages = useLiveQuery(
    async () => {
      if (!conversationId) return [];
      const messages = await cache.messages
        .where("conversationId")
        .equals(conversationId)
        .toArray();
      return sortMessages(messages as any[]);
    },
    [conversationId],
    undefined,
  );

  useEffect(() => {
    if (!conversationId) {
      setIsLoading(false);
      setStatus("Exhausted");
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let messageEventSource: EventSource | null = null;
    let generationEventSource: EventSource | null = null;

    const closeRealtimeStreams = () => {
      messageEventSource?.close();
      messageEventSource = null;
      generationEventSource?.close();
      generationEventSource = null;
    };

    const fetchMessages = async () => {
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/messages`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const payload = await response.json();
      const messages = extractMessagesFromPayload(payload);
      await syncConversationMessages(conversationId, messages);
      if (!cancelled) {
        setIsLoading(false);
        setStatus("Exhausted");
      }
    };

    const startPollingFallback = () => {
      if (pollTimer) {
        return;
      }

      pollTimer = setInterval(() => {
        void fetchMessages().catch(() => {
          if (!cancelled) {
            setStatus("Error");
          }
        });
      }, 1000);
    };

    const connectMessageStream = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      generationEventSource?.close();
      generationEventSource = null;
      messageEventSource?.close();

      messageEventSource = new EventSource(
        `/api/v1/messages/stream/${conversationId}`,
      );

      const handleMessage = async (event: MessageEvent<string>) => {
        const messages = extractMessagesFromPayload(JSON.parse(event.data));
        await syncConversationMessages(conversationId, messages);
        if (!cancelled) {
          setIsLoading(false);
          setStatus("Exhausted");
        }
      };

      messageEventSource.addEventListener("snapshot", (event) => {
        void handleMessage(event as MessageEvent<string>);
      });
      messageEventSource.addEventListener("update", (event) => {
        void handleMessage(event as MessageEvent<string>);
      });
      messageEventSource.onerror = () => {
        messageEventSource?.close();
        messageEventSource = null;
        startPollingFallback();
      };
    };

    const connectGenerationStream = (streamUrl: string) => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      messageEventSource?.close();
      messageEventSource = null;
      generationEventSource?.close();

      generationEventSource = new EventSource(streamUrl);
      generationEventSource.addEventListener("generation", (event) => {
        void (async () => {
          const generationEvent = parseGenerationEvent(
            JSON.parse((event as MessageEvent<string>).data),
          );
          await syncGenerationEvent(conversationId, generationEvent);
          if (!cancelled) {
            setIsLoading(false);
            setStatus("Exhausted");
          }

          if (isTerminalGenerationEvent(generationEvent)) {
            generationEventSource?.close();
            generationEventSource = null;
            await fetchMessages().catch(() => {
              if (!cancelled) {
                setStatus("Error");
              }
            });
            if (!cancelled) {
              connectMessageStream();
            }
          }
        })();
      });
      generationEventSource.onerror = () => {
        generationEventSource?.close();
        generationEventSource = null;
        void fetchMessages()
          .catch(() => {
            if (!cancelled) {
              setStatus("Error");
            }
          })
          .finally(() => {
            if (!cancelled) {
              connectMessageStream();
            }
          });
      };
    };

    const connectActiveGenerationIfAny = async () => {
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/active-generation`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (response.status === 404) {
        return false;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch active generation: ${response.status}`,
        );
      }

      const payload = (await response.json()) as ActiveGenerationEnvelope;
      const streamUrl = payload.data?.streamUrl;
      if (!streamUrl) {
        return false;
      }

      connectGenerationStream(streamUrl);
      return true;
    };

    const handleGenerationStarted = (event: Event) => {
      const detail = (event as CustomEvent<GenerationStartedDetail>).detail;
      if (!detail || detail.conversationId !== conversationId) {
        return;
      }

      void (async () => {
        const pendingAssistantMessages = createPendingAssistantMessages({
          conversationId,
          assistantMessageId: detail.assistantMessageId,
          assistantMessageIds: detail.assistantMessageIds,
          assistantModelId: detail.assistantModelId,
          modelIds: detail.modelIds,
        });

        if (pendingAssistantMessages.length > 0) {
          await cache.messages.bulkPut(pendingAssistantMessages as any[]);
        }

        await fetchMessages();
      })()
        .catch(() => {
          if (!cancelled) {
            setStatus("Error");
          }
        })
        .finally(() => {
          if (!cancelled) {
            connectGenerationStream(detail.streamUrl);
          }
        });
    };

    setIsLoading(true);
    setStatus("LoadingFirstPage");
    window.addEventListener(
      "generation-request-started",
      handleGenerationStarted as EventListener,
    );

    void fetchMessages()
      .catch(() => {
        if (!cancelled) {
          setStatus("Error");
        }
      })
      .then(() => connectActiveGenerationIfAny())
      .then((connected) => {
        if (!cancelled && !connected) {
          connectMessageStream();
        }
      })
      .catch(() => {
        if (!cancelled) {
          connectMessageStream();
        }
      });

    return () => {
      cancelled = true;
      closeRealtimeStreams();
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      window.removeEventListener(
        "generation-request-started",
        handleGenerationStarted as EventListener,
      );
    };
  }, [conversationId]);

  const results = useMemo(() => {
    if (conversationId !== previousConversationIdRef.current) {
      previousConversationIdRef.current = conversationId;
      return undefined;
    }
    return cachedMessages;
  }, [cachedMessages, conversationId]);

  return {
    results,
    loadMore: NOOP_LOAD_MORE,
    status,
    isLoading,
    isFirstLoad: isLoading && results === undefined,
  };
}
