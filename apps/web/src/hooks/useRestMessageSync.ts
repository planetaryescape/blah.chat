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

/** Statuses for rows that may carry client-side streaming state. */
const IN_FLIGHT_STATUSES = new Set(["pending", "generating"]);

/** How often buffered streaming writes are flushed to Dexie. */
const STREAM_FLUSH_INTERVAL_MS = 100;

const MESSAGE_STREAM_RETRY_INITIAL_MS = 1_000;
const MESSAGE_STREAM_RETRY_MAX_MS = 30_000;

const REFETCH_EVENT = "messages-refetch-requested";

/**
 * Ask the active message sync for this conversation to refetch from the
 * server now (e.g. after a branch switch changes isActiveBranch server-side).
 */
export function requestMessagesRefetch(conversationId: string) {
  window.dispatchEvent(
    new CustomEvent(REFETCH_EVENT, { detail: { conversationId } }),
  );
}

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

/**
 * Apply a generation event to a single message row.
 * Returns null when the event should be ignored (unknown start/ack, late ack).
 */
export function applyGenerationEventToMessage(
  existing: ApiMessage | undefined,
  conversationId: string,
  event: GenerationEvent,
): ApiMessage | null {
  const shouldIgnoreUnknownNonTerminalEvent =
    !existing && (event.type === "start" || event.type === "ack");

  if (shouldIgnoreUnknownNonTerminalEvent) {
    return null;
  }

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

  switch (event.type) {
    case "ack":
      // Late ack arrival when real content already streamed — drop it.
      if ((base.partialContent ?? base.content ?? "").length > 0) {
        return null;
      }
      // The ack model must not flip the message's model badge.
      return { ...base, ackText: event.text, updatedAt: event.ts };
    case "start":
      return {
        ...base,
        model: event.modelId,
        status: "generating",
        partialContent: currentContent || undefined,
        updatedAt: event.ts,
      };
    case "delta": {
      const nextContent = `${currentContent}${event.delta}`;
      return {
        ...base,
        model: event.modelId,
        content: nextContent,
        partialContent: nextContent,
        status: "generating",
        ackText: undefined,
        updatedAt: event.ts,
      };
    }
    case "checkpoint":
      return {
        ...base,
        model: event.modelId,
        content: event.content,
        partialContent: event.content,
        status: "generating",
        ackText: undefined,
        updatedAt: event.ts,
      };
    case "complete":
      return {
        ...base,
        model: event.modelId,
        content: event.content,
        partialContent: undefined,
        status: "complete",
        ackText: undefined,
        updatedAt: event.ts,
      };
    case "cancelled":
      return {
        ...base,
        model: event.modelId,
        status: "stopped",
        partialContent: undefined,
        ackText: undefined,
        updatedAt: event.ts,
      };
    case "error":
      return {
        ...base,
        model: event.modelId,
        status: "error",
        partialContent: undefined,
        ackText: undefined,
        updatedAt: event.ts,
      };
  }
}

export function applyGenerationEventToMessages(
  messages: ApiMessage[],
  conversationId: string,
  event: GenerationEvent,
) {
  const index = messages.findIndex(
    (message) => message._id === event.assistantMessageId,
  );
  const existing = index === -1 ? undefined : messages[index];
  const nextMessage = applyGenerationEventToMessage(
    existing,
    conversationId,
    event,
  );

  if (!nextMessage) {
    return sortMessages(messages);
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

/**
 * Merge a server snapshot row over local state without regressing live data:
 * a snapshot must never blank streamed text, revert a completed message, or
 * wipe the transient ack line.
 */
export function mergeSnapshotMessage(
  existing: ApiMessage | undefined,
  incoming: ApiMessage,
): ApiMessage {
  if (!existing) return incoming;

  const existingContent = existing.partialContent ?? existing.content ?? "";
  const incomingContent = incoming.partialContent ?? incoming.content ?? "";

  // A settled local message outranks any snapshot that claims it is still
  // in flight (stale response or replica lag).
  if (
    (existing.status === "complete" ||
      existing.status === "error" ||
      existing.status === "stopped") &&
    incoming.status !== "complete" &&
    (existing.updatedAt ?? 0) >= (incoming.updatedAt ?? 0)
  ) {
    return existing;
  }

  if (existing.status && IN_FLIGHT_STATUSES.has(existing.status)) {
    // Never let a non-terminal snapshot shrink streamed text.
    if (
      incoming.status !== "complete" &&
      incomingContent.length < existingContent.length
    ) {
      return {
        ...incoming,
        content: existing.content,
        partialContent: existing.partialContent,
        status: existing.status,
        ackText: existing.ackText,
        updatedAt: existing.updatedAt,
      };
    }
    // Snapshots never carry the transient ack; keep it until content lands.
    if (incomingContent.length === 0 && existing.ackText) {
      return { ...incoming, ackText: existing.ackText };
    }
  }

  return incoming;
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
    let messageStreamRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let messageStreamRetryDelay = MESSAGE_STREAM_RETRY_INITIAL_MS;
    const generationStreams = new Map<string, EventSource>();

    // All cache writes flow through this queue so SSE events, snapshot syncs,
    // and polling can never interleave reads and writes (lost-delta race).
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (task: () => Promise<void>) => {
      queue = queue.then(task).catch((error) => {
        console.warn("message sync task failed", error);
      });
      return queue;
    };

    // Streaming writes are buffered and flushed as single-row puts instead of
    // rewriting the whole conversation per token.
    const pendingWrites = new Map<string, ApiMessage>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPendingWrites = async () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (pendingWrites.size === 0) return;
      const rows = [...pendingWrites.values()];
      pendingWrites.clear();
      await cache.messages.bulkPut(rows as any[]);
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void enqueue(flushPendingWrites);
      }, STREAM_FLUSH_INTERVAL_MS);
    };

    const closeRealtimeStreams = () => {
      messageEventSource?.close();
      messageEventSource = null;
      if (messageStreamRetryTimer) {
        clearTimeout(messageStreamRetryTimer);
        messageStreamRetryTimer = null;
      }
      for (const source of generationStreams.values()) {
        source.close();
      }
      generationStreams.clear();
    };

    const markLoaded = () => {
      if (cancelled) return;
      setIsLoading(false);
      setStatus("Exhausted");
    };

    const syncSnapshot = async (
      incoming: ApiMessage[],
      fetchStartedAt: number,
    ) => {
      // Flush buffered streaming state first so the merge sees latest local.
      await flushPendingWrites();

      const sorted = sortMessages(incoming);
      const incomingIds = new Set(sorted.map((message) => message._id));
      const existing = (await cache.messages
        .where("conversationId")
        .equals(conversationId)
        .toArray()) as unknown as ApiMessage[];
      const existingById = new Map(
        existing.map((message) => [message._id, message]),
      );

      // Only delete rows the server confirmably no longer has: settled rows
      // that predate this fetch. In-flight rows and rows created after the
      // snapshot was taken are kept (they are newer than the snapshot).
      const orphanIds = existing
        .filter(
          (message) =>
            !incomingIds.has(message._id) &&
            !(message.status && IN_FLIGHT_STATUSES.has(message.status)) &&
            (message.updatedAt ?? 0) < fetchStartedAt,
        )
        .map((message) => message._id);

      if (orphanIds.length > 0) {
        await cache.messages.bulkDelete(orphanIds);
      }

      if (sorted.length > 0) {
        const merged = sorted.map((message) =>
          mergeSnapshotMessage(existingById.get(message._id), message),
        );
        await cache.messages.bulkPut(merged as any[]);
      }
    };

    const fetchSnapshot = async () => {
      const fetchStartedAt = Date.now();
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/messages`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const payload = await response.json();
      return { messages: extractMessagesFromPayload(payload), fetchStartedAt };
    };

    const syncFromServer = async () => {
      try {
        const { messages, fetchStartedAt } = await fetchSnapshot();
        await syncSnapshot(messages, fetchStartedAt);
        markLoaded();
      } catch (error) {
        if (!cancelled) {
          setStatus("Error");
        }
        throw error;
      }
    };

    const startPollingFallback = () => {
      if (pollTimer) {
        return;
      }

      pollTimer = setInterval(() => {
        void enqueue(async () => {
          await syncFromServer().catch(() => {});
        });
      }, 1000);
    };

    const stopPollingFallback = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connectMessageStream = () => {
      if (cancelled || generationStreams.size > 0) {
        return;
      }
      stopPollingFallback();
      messageEventSource?.close();

      messageEventSource = new EventSource(
        `/api/v1/messages/stream/${conversationId}`,
      );

      const handleMessage = (event: MessageEvent<string>) => {
        const receivedAt = Date.now();
        void enqueue(async () => {
          const messages = extractMessagesFromPayload(JSON.parse(event.data));
          await syncSnapshot(messages, receivedAt);
          markLoaded();
        });
      };

      messageEventSource.addEventListener("snapshot", (event) => {
        handleMessage(event as MessageEvent<string>);
      });
      messageEventSource.addEventListener("update", (event) => {
        handleMessage(event as MessageEvent<string>);
      });
      messageEventSource.onopen = () => {
        messageStreamRetryDelay = MESSAGE_STREAM_RETRY_INITIAL_MS;
        stopPollingFallback();
      };
      messageEventSource.onerror = () => {
        messageEventSource?.close();
        messageEventSource = null;
        if (cancelled) return;
        // Poll while disconnected, but keep retrying the stream with backoff
        // instead of degrading to polling permanently.
        startPollingFallback();
        if (messageStreamRetryTimer) {
          clearTimeout(messageStreamRetryTimer);
        }
        messageStreamRetryTimer = setTimeout(() => {
          messageStreamRetryTimer = null;
          connectMessageStream();
        }, messageStreamRetryDelay);
        messageStreamRetryDelay = Math.min(
          messageStreamRetryDelay * 2,
          MESSAGE_STREAM_RETRY_MAX_MS,
        );
      };
    };

    const handleGenerationEvent = async (
      requestId: string,
      event: GenerationEvent,
    ) => {
      const id = event.assistantMessageId;
      const current =
        pendingWrites.get(id) ??
        ((await cache.messages.get(id)) as unknown as ApiMessage | undefined);
      const next = applyGenerationEventToMessage(
        current,
        conversationId,
        event,
      );
      if (next) {
        pendingWrites.set(id, next);
      }

      if (isTerminalGenerationEvent(event)) {
        await flushPendingWrites();
        const source = generationStreams.get(requestId);
        if (source) {
          source.close();
          generationStreams.delete(requestId);
        }
        await syncFromServer().catch(() => {});
        if (!cancelled && generationStreams.size === 0) {
          connectMessageStream();
        }
      } else {
        scheduleFlush();
        markLoaded();
      }
    };

    const connectGenerationStream = (requestId: string, streamUrl: string) => {
      stopPollingFallback();
      messageEventSource?.close();
      messageEventSource = null;
      generationStreams.get(requestId)?.close();

      const source = new EventSource(streamUrl);
      generationStreams.set(requestId, source);

      source.addEventListener("generation", (event) => {
        void enqueue(async () => {
          const generationEvent = parseGenerationEvent(
            JSON.parse((event as MessageEvent<string>).data),
          );
          await handleGenerationEvent(requestId, generationEvent);
        });
      });
      source.onerror = () => {
        source.close();
        generationStreams.delete(requestId);
        if (cancelled) return;
        void enqueue(async () => {
          await flushPendingWrites();
          await syncFromServer().catch(() => {});
        }).then(() => {
          if (cancelled) return;
          void connectActiveGenerationIfAny()
            .catch(() => false)
            .then((connected) => {
              if (!cancelled && !connected && generationStreams.size === 0) {
                connectMessageStream();
              }
            });
        });
      };
    };

    const connectActiveGenerationIfAny = async () => {
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/active-generation`,
        {
          credentials: "include",
          cache: "no-store",
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
      const requestId = payload.data?.requestId;
      if (!streamUrl) {
        return false;
      }

      connectGenerationStream(requestId ?? streamUrl, streamUrl);
      return true;
    };

    const handleGenerationStarted = (event: Event) => {
      const detail = (event as CustomEvent<GenerationStartedDetail>).detail;
      if (!detail || detail.conversationId !== conversationId) {
        return;
      }

      // Subscribe first, snapshot second: events buffer behind the queue and
      // the Redis log replays from seq 0, so nothing is missed; the snapshot
      // can never overwrite events that arrive while it is in flight.
      connectGenerationStream(detail.requestId, detail.streamUrl);

      void enqueue(async () => {
        const pendingAssistantMessages = createPendingAssistantMessages({
          conversationId,
          assistantMessageId: detail.assistantMessageId,
          assistantMessageIds: detail.assistantMessageIds,
          assistantModelId: detail.assistantModelId,
          modelIds: detail.modelIds,
        });

        for (const message of pendingAssistantMessages) {
          // Don't clobber rows the stream already updated (e.g. an ack).
          const existing = await cache.messages.get(message._id);
          if (!existing && !pendingWrites.has(message._id)) {
            await cache.messages.put(message as any);
          }
        }

        await syncFromServer().catch(() => {});
      });
    };

    const handleWake = () => {
      if (cancelled) return;
      void enqueue(async () => {
        await syncFromServer().catch(() => {});
      }).then(() => {
        if (cancelled || generationStreams.size > 0) return;
        void connectActiveGenerationIfAny()
          .catch(() => false)
          .then((connected) => {
            if (
              !cancelled &&
              !connected &&
              generationStreams.size === 0 &&
              !messageEventSource
            ) {
              connectMessageStream();
            }
          });
      });
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // bfcache restore: streams are dead and state may be stale.
      if (event.persisted) {
        closeRealtimeStreams();
        handleWake();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleWake();
      }
    };

    const handleRefetchRequested = (event: Event) => {
      const detail = (event as CustomEvent<{ conversationId?: string }>).detail;
      if (detail?.conversationId !== conversationId) return;
      void enqueue(async () => {
        await syncFromServer().catch(() => {});
      });
    };

    setIsLoading(true);
    setStatus("LoadingFirstPage");
    window.addEventListener(
      "generation-request-started",
      handleGenerationStarted as EventListener,
    );
    window.addEventListener("online", handleWake);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener(REFETCH_EVENT, handleRefetchRequested);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void enqueue(async () => {
      await syncFromServer().catch(() => {});
    }).then(() => {
      if (cancelled) return;
      void connectActiveGenerationIfAny()
        .catch(() => false)
        .then((connected) => {
          if (!cancelled && !connected && generationStreams.size === 0) {
            connectMessageStream();
          }
        });
    });

    return () => {
      cancelled = true;
      closeRealtimeStreams();
      stopPollingFallback();
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (pendingWrites.size > 0) {
        void cache.messages.bulkPut([...pendingWrites.values()] as any[]);
        pendingWrites.clear();
      }
      window.removeEventListener(
        "generation-request-started",
        handleGenerationStarted as EventListener,
      );
      window.removeEventListener("online", handleWake);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener(REFETCH_EVENT, handleRefetchRequested);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
