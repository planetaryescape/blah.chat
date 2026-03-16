"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { cache } from "@/lib/cache";

type ApiMessage = {
  _id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  partialContent?: string;
  status?: string;
  model?: string;
  comparisonGroupId?: string;
  consolidatedMessageId?: string;
  isConsolidation?: boolean;
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

interface MessageSyncOptions {
  conversationId: Id<"conversations"> | undefined;
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
    let eventSource: EventSource | null = null;

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

    const connect = () => {
      eventSource = new EventSource(
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

      eventSource.addEventListener("snapshot", (event) => {
        void handleMessage(event as MessageEvent<string>);
      });
      eventSource.addEventListener("update", (event) => {
        void handleMessage(event as MessageEvent<string>);
      });
      eventSource.onerror = () => {
        eventSource?.close();
        if (!pollTimer) {
          pollTimer = setInterval(() => {
            void fetchMessages().catch(() => {
              if (!cancelled) {
                setStatus("Error");
              }
            });
          }, 1000);
        }
      };
    };

    setIsLoading(true);
    setStatus("LoadingFirstPage");
    void fetchMessages()
      .catch(() => {
        if (!cancelled) {
          setStatus("Error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          connect();
        }
      });

    return () => {
      cancelled = true;
      eventSource?.close();
      if (pollTimer) {
        clearInterval(pollTimer);
      }
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
