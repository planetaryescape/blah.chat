"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import {
  type PrefetchableRow,
  prefetchConversationIntoCache,
  prefetchMessagesIntoCache,
} from "@/lib/cache";

function extractConversation(payload: unknown): PrefetchableRow | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data
  ) {
    return payload.data as PrefetchableRow;
  }

  return undefined;
}

function extractMessages(payload: unknown): PrefetchableRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((item) =>
    item && typeof item === "object" && "data" in item && item.data
      ? [item.data as PrefetchableRow]
      : [],
  );
}

/**
 * Best-effort REST prefetch to warm the local cache ahead of navigation.
 * Writes go through the prefetch merge guards so a stale snapshot can never
 * clobber rows the active sync already streamed or persisted.
 */
export function ConversationPrefetcher({
  conversationId,
}: {
  conversationId: string;
}) {
  const params = useParams<{ conversationId?: string }>();
  const activeConversationId = params?.conversationId;

  useEffect(() => {
    // The open conversation is owned by the live message sync; prefetching it
    // is wasted work and risks racing the sync's writes.
    if (conversationId === activeConversationId) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const prefetch = async () => {
      try {
        const [conversationResponse, messagesResponse] = await Promise.all([
          fetch(`/api/v1/conversations/${conversationId}`, {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }),
          fetch(`/api/v1/conversations/${conversationId}/messages`, {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }),
        ]);

        if (!conversationResponse.ok || !messagesResponse.ok || cancelled) {
          return;
        }

        const [conversationPayload, messagesPayload] = await Promise.all([
          conversationResponse.json(),
          messagesResponse.json(),
        ]);

        if (cancelled) {
          return;
        }

        const conversation = extractConversation(conversationPayload);
        const messages = extractMessages(messagesPayload);

        if (conversation) {
          await prefetchConversationIntoCache(conversation);
        }
        if (messages.length > 0) {
          await prefetchMessagesIntoCache(messages);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Conversation prefetch failed:", error);
        }
      }
    };

    void prefetch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [conversationId, activeConversationId]);

  return null;
}
