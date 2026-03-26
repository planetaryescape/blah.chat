"use client";

import { useQuery as useReactQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef } from "react";
import { cache } from "@/lib/cache";

type CachedMessage = any;
type CachedSource = any & {
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
    siteName?: string;
    enriched: boolean;
  } | null;
};

type MessageMetadataPayload = {
  attachments: any[];
  toolCalls: any[];
  sources: CachedSource[];
};

async function fetchMessageMetadata(messageIds: string[]) {
  if (messageIds.length === 0) {
    return {
      attachments: [],
      toolCalls: [],
      sources: [],
    } satisfies MessageMetadataPayload;
  }

  const response = await fetch("/api/v1/messages/metadata", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messageIds }),
  });
  const payload = (await response.json()) as {
    data?: MessageMetadataPayload;
    error?: string;
  };

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Failed to fetch message metadata");
  }

  return payload.data;
}

export function getPrimaryParentId(
  message: Pick<CachedMessage, "parentMessageId" | "parentMessageIds">,
): string | undefined {
  if (Array.isArray(message.parentMessageIds) && message.parentMessageIds[0]) {
    return String(message.parentMessageIds[0]);
  }
  if (message.parentMessageId) {
    return String(message.parentMessageId);
  }
  return undefined;
}

function compareTreeOrder(a: CachedMessage, b: CachedMessage): number {
  const aSibling = typeof a.siblingIndex === "number" ? a.siblingIndex : 0;
  const bSibling = typeof b.siblingIndex === "number" ? b.siblingIndex : 0;
  if (aSibling !== bSibling) return aSibling - bSibling;
  if (a._creationTime !== b._creationTime)
    return a._creationTime - b._creationTime;
  return String(a._id).localeCompare(String(b._id));
}

function buildMessageMap(
  messages: CachedMessage[],
): Map<string, CachedMessage> {
  return new Map(messages.map((message) => [String(message._id), message]));
}

function collectPathFromActiveLeaf(
  byId: Map<string, CachedMessage>,
  activeLeafMessageId: string | string | undefined,
  visited: Set<string>,
): CachedMessage[] {
  if (!activeLeafMessageId) return [];

  const path: CachedMessage[] = [];
  let current = byId.get(String(activeLeafMessageId));
  while (current) {
    const currentId = String(current._id);
    if (visited.has(currentId)) break;
    visited.add(currentId);
    path.push(current);
    const parentId = getPrimaryParentId(current);
    current = parentId ? byId.get(parentId) : undefined;
  }
  return path.reverse();
}

function buildChildrenByParent(
  messages: CachedMessage[],
): Map<string, CachedMessage[]> {
  const childrenByParent = new Map<string, CachedMessage[]>();
  for (const message of messages) {
    const parentId = getPrimaryParentId(message);
    if (!parentId) continue;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(message);
    childrenByParent.set(parentId, siblings);
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort(compareTreeOrder);
  }
  return childrenByParent;
}

function getRootMessages(
  messages: CachedMessage[],
  byId: Map<string, CachedMessage>,
): CachedMessage[] {
  return messages
    .filter((message) => {
      const parentId = getPrimaryParentId(message);
      return !parentId || !byId.has(parentId);
    })
    .sort(compareTreeOrder);
}

function pushDepthFirstMessages(
  message: CachedMessage,
  childrenByParent: Map<string, CachedMessage[]>,
  visited: Set<string>,
  ordered: CachedMessage[],
): void {
  const messageId = String(message._id);
  if (visited.has(messageId)) return;
  visited.add(messageId);
  ordered.push(message);
  for (const child of childrenByParent.get(messageId) ?? []) {
    pushDepthFirstMessages(child, childrenByParent, visited, ordered);
  }
}

function appendRemainingMessages(
  messages: CachedMessage[],
  visited: Set<string>,
  ordered: CachedMessage[],
): void {
  if (ordered.length === messages.length) return;
  const remaining = messages
    .filter((message) => !visited.has(String(message._id)))
    .sort(compareTreeOrder);
  ordered.push(...remaining);
}

export function orderMessagesByActivePath(
  messages: CachedMessage[],
  activeLeafMessageId?: string | string,
): CachedMessage[] {
  if (messages.length <= 1) return messages;

  const byId = buildMessageMap(messages);
  const ordered: CachedMessage[] = [];
  const visited = new Set<string>();

  ordered.push(
    ...collectPathFromActiveLeaf(byId, activeLeafMessageId, visited),
  );
  const childrenByParent = buildChildrenByParent(messages);
  const roots = getRootMessages(messages, byId);

  for (const root of roots) {
    pushDepthFirstMessages(root, childrenByParent, visited, ordered);
  }

  appendRemainingMessages(messages, visited, ordered);

  return ordered;
}

export function getChildMessagesForParent(
  messages: CachedMessage[],
  parentMessageId: string | string,
): CachedMessage[] {
  const targetParentId = String(parentMessageId);
  const children = messages.filter((message) => {
    if (
      message.parentMessageId &&
      String(message.parentMessageId) === targetParentId
    ) {
      return true;
    }
    return (
      Array.isArray(message.parentMessageIds) &&
      message.parentMessageIds.some((id: any) => String(id) === targetParentId)
    );
  });

  return children.sort(compareTreeOrder);
}

export function getSiblingsForMessage(
  messages: CachedMessage[],
  message: CachedMessage,
): CachedMessage[] {
  const parentId = getPrimaryParentId(message);
  if (!parentId) return [message];

  return messages
    .filter((candidate) => getPrimaryParentId(candidate) === parentId)
    .sort(compareTreeOrder);
}

export function useMetadataCacheSync(messageIds: string[]) {
  const prevIdsRef = useRef<string[]>([]);
  const stableIds = useMemo(() => {
    const changed =
      messageIds.length !== prevIdsRef.current.length ||
      messageIds.some((id, i) => id !== prevIdsRef.current[i]);
    if (changed) prevIdsRef.current = messageIds;
    return prevIdsRef.current;
  }, [messageIds]);

  const { data: metadata } = useReactQuery({
    queryKey: ["message-metadata", stableIds],
    queryFn: () => fetchMessageMetadata(stableIds.map(String)),
    enabled: stableIds.length > 0,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!metadata) return;

    const syncOps: Promise<unknown>[] = [];
    if (metadata.attachments?.length) {
      syncOps.push(cache.attachments.bulkPut(metadata.attachments));
    }
    if (metadata.toolCalls?.length) {
      syncOps.push(cache.toolCalls.bulkPut(metadata.toolCalls));
    }
    if (metadata.sources?.length) {
      syncOps.push(cache.sources.bulkPut(metadata.sources));
    }
    if (syncOps.length > 0) {
      Promise.all(syncOps).catch(console.error);
    }
  }, [metadata]);
}

export function useCachedAttachments(messageId: string | string) {
  return useLiveQuery(
    () => cache.attachments.where("messageId").equals(messageId).toArray(),
    [messageId],
    [] as any[],
  );
}

export function useCachedToolCalls(messageId: string | string) {
  return useLiveQuery(
    () => cache.toolCalls.where("messageId").equals(messageId).toArray(),
    [messageId],
    [] as any[],
  );
}

export function useCachedSources(messageId: string | string) {
  return useLiveQuery(
    () => cache.sources.where("messageId").equals(messageId).toArray(),
    [messageId],
    [] as any[],
  );
}

export function useCachedChildBranches(parentMessageId: string | string) {
  return useLiveQuery(
    () =>
      cache.conversations
        .where("parentMessageId")
        .equals(parentMessageId)
        .toArray(),
    [parentMessageId],
    [] as any[],
  );
}

/**
 * P7 Tree Architecture: Get child messages (siblings in tree) for a message
 * Used for in-conversation branch navigation
 */
export function useCachedChildMessages(parentMessageId: string | string) {
  return useLiveQuery(
    async () => {
      const parentMessage = await cache.messages.get(parentMessageId);
      if (!parentMessage) {
        return cache.messages
          .where("parentMessageId")
          .equals(parentMessageId)
          .sortBy("siblingIndex");
      }

      const conversationMessages = await cache.messages
        .where("conversationId")
        .equals(parentMessage.conversationId)
        .toArray();

      return getChildMessagesForParent(conversationMessages, parentMessageId);
    },
    [parentMessageId],
    [] as any[],
  );
}

/**
 * P7 Tree Architecture: Get sibling messages (same parent) for a message
 * Used for branch switching UI
 */
export function useCachedSiblings(messageId: string | string) {
  return useLiveQuery(
    async () => {
      const message = await cache.messages.get(messageId);
      if (!message) return [];

      const conversationMessages = await cache.messages
        .where("conversationId")
        .equals(message.conversationId)
        .toArray();

      return getSiblingsForMessage(conversationMessages, message);
    },
    [messageId],
    [] as any[],
  );
}
