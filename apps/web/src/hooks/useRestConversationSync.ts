"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { cache } from "@/lib/cache";

type ApiConversation = any;

type ConversationEnvelope = {
  data?: ApiConversation;
};

type ConversationListPayload =
  | ConversationEnvelope[]
  | {
      conversations?: ConversationEnvelope[];
      data?: {
        items?: ConversationEnvelope[];
      };
    };

function extractConversationsFromPayload(payload: unknown): ApiConversation[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) =>
      item && typeof item === "object" && "data" in item && item.data
        ? [item.data as ApiConversation]
        : [],
    );
  }

  if (payload && typeof payload === "object") {
    if ("conversations" in payload) {
      const items = (payload as { conversations?: ConversationEnvelope[] })
        .conversations;
      return (items ?? []).flatMap((item) => (item?.data ? [item.data] : []));
    }

    if ("data" in payload) {
      const items = (
        payload as {
          data?: { items?: ConversationEnvelope[] };
        }
      ).data?.items;
      return (items ?? []).flatMap((item) => (item?.data ? [item.data] : []));
    }
  }

  return [];
}

function sortConversations(conversations: ApiConversation[]) {
  return [...conversations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.lastMessageAt - a.lastMessageAt;
  });
}

async function syncConversationCache(
  incomingConversations: ApiConversation[],
  projectId?: string | null,
) {
  const incoming = sortConversations(incomingConversations);
  const incomingIds = new Set(incoming.map((conversation) => conversation._id));
  const existing = await cache.conversations.toArray();

  const relevantExisting = existing.filter((conversation) => {
    if (projectId === "none") {
      return !conversation.projectId;
    }
    if (projectId) {
      return conversation.projectId === projectId;
    }
    return true;
  });

  const orphanIds = relevantExisting
    .filter((conversation) => !incomingIds.has(conversation._id))
    .map((conversation) => conversation._id);

  if (orphanIds.length > 0) {
    await cache.conversations.bulkDelete(orphanIds);
  }

  if (incoming.length > 0) {
    await cache.conversations.bulkPut(incoming as any[]);
  }
}

async function getConversationsByProject(
  projectId?: string | "none" | null,
): Promise<any[]> {
  let conversations: any[];

  if (projectId && projectId !== "none") {
    conversations = await cache.conversations
      .where("projectId")
      .equals(projectId)
      .toArray();
  } else if (projectId === "none") {
    conversations = (await cache.conversations.toArray()).filter(
      (conversation) => !conversation.projectId,
    );
  } else {
    conversations = await cache.conversations.toArray();
  }

  return sortConversations(conversations);
}

export function useRestConversationSync(projectId?: string | "none" | null) {
  const [isLoading, setIsLoading] = useState(true);

  const cachedConversations = useLiveQuery(
    () => getConversationsByProject(projectId),
    [projectId],
    [] as any[],
  );

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let eventSource: EventSource | null = null;

    // All cache writes flow through this queue: SSE updates and full fetches
    // each do a read -> bulkDelete -> bulkPut sequence that must never
    // interleave with another writer's.
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (task: () => Promise<void>) => {
      queue = queue.then(task).catch((error) => {
        console.warn("conversation sync task failed", error);
      });
      return queue;
    };

    // Bumped on every applied SSE update. A full fetch snapshots it before
    // hitting the network; if it moved by the time the payload is applied,
    // the payload is stale (it could resurrect rows the stream deleted).
    let appliedGeneration = 0;

    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }

    const queryString = params.toString();
    const listUrl = queryString
      ? `/api/v1/conversations?${queryString}`
      : "/api/v1/conversations";
    const streamUrl = queryString
      ? `/api/v1/conversations/stream?${queryString}`
      : "/api/v1/conversations/stream";

    const fetchConversations = async () => {
      const generationAtStart = appliedGeneration;
      const response = await fetch(listUrl, {
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const payload = (await response.json()) as ConversationListPayload;
      await enqueue(async () => {
        // SSE updates landed while this fetch was in flight — the payload is
        // stale, drop it (the stream already carries the newer state).
        if (appliedGeneration !== generationAtStart) {
          return;
        }
        await syncConversationCache(
          extractConversationsFromPayload(payload),
          projectId ?? undefined,
        );
      });
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    const connect = () => {
      eventSource = new EventSource(streamUrl);

      const handleMessage = (event: MessageEvent<string>) => {
        const payload = JSON.parse(event.data) as ConversationListPayload;
        void enqueue(async () => {
          await syncConversationCache(
            extractConversationsFromPayload(payload),
            projectId ?? undefined,
          );
          appliedGeneration += 1;
          if (!cancelled) {
            setIsLoading(false);
          }
        });
      };

      eventSource.addEventListener("snapshot", (event) => {
        handleMessage(event as MessageEvent<string>);
      });
      eventSource.addEventListener("update", (event) => {
        handleMessage(event as MessageEvent<string>);
      });
      eventSource.onerror = () => {
        eventSource?.close();
        if (!pollTimer) {
          pollTimer = setInterval(() => {
            void fetchConversations().catch(() => {
              if (!cancelled) {
                setIsLoading(false);
              }
            });
          }, 1000);
        }
      };
    };

    setIsLoading(true);
    void fetchConversations()
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
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
  }, [projectId]);

  return {
    conversations: cachedConversations,
    isLoading,
  };
}
