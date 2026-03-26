"use client";

import { useEffect } from "react";
import { cache } from "@/lib/cache";

function extractConversation(payload: unknown): any | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data
  ) {
    return payload.data as any;
  }

  return undefined;
}

function extractMessages(payload: unknown): any[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((item) =>
    item && typeof item === "object" && "data" in item && item.data
      ? [item.data as any]
      : [],
  );
}

/**
 * Best-effort REST prefetch to warm the local cache ahead of navigation.
 */
export function ConversationPrefetcher({
  conversationId,
}: {
  conversationId: string;
}) {
  useEffect(() => {
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
          await cache.conversations.put(conversation);
        }
        if (messages.length > 0) {
          await cache.messages.bulkPut(messages);
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
  }, [conversationId]);

  return null;
}
