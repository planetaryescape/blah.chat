import type { GenerationStreamEvent } from "@blah-chat/api-client";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { requireApiKey, requireClient } from "../lib/client.js";
import type { Message } from "../lib/queries.js";
import { getActiveGeneration, listMessages } from "../lib/queries.js";
import type { Id } from "../lib/types.js";

function buildAssistantMessage(
  conversationId: Id<"conversations">,
  event: GenerationStreamEvent,
): Message {
  return {
    _id: event.assistantMessageId,
    conversationId,
    role: "assistant",
    content: "",
    partialContent: "",
    status: "pending",
    model: event.modelId,
    createdAt: event.ts,
  };
}

function updateAssistantMessage(
  messages: Message[],
  conversationId: Id<"conversations">,
  event: GenerationStreamEvent,
  patch: Partial<Message>,
): Message[] {
  const index = messages.findIndex((message) => {
    return message._id === event.assistantMessageId;
  });
  const current =
    index >= 0 ? messages[index] : buildAssistantMessage(conversationId, event);
  const nextMessage = {
    ...current,
    ...patch,
  };

  if (index >= 0) {
    return messages.map((message, messageIndex) => {
      return messageIndex === index ? nextMessage : message;
    });
  }

  return [...messages, nextMessage];
}

function applyGenerationEvent(
  messages: Message[] | null | undefined,
  conversationId: Id<"conversations">,
  event: GenerationStreamEvent,
): Message[] {
  const currentMessages = messages ?? [];
  const existing = currentMessages.find((message) => {
    return message._id === event.assistantMessageId;
  });
  const currentContent =
    existing?.partialContent ?? existing?.content ?? event.content ?? "";

  switch (event.type) {
    case "started":
      return updateAssistantMessage(currentMessages, conversationId, event, {
        status: "pending",
        model: event.modelId,
      });
    case "delta":
      return updateAssistantMessage(currentMessages, conversationId, event, {
        status: "generating",
        model: event.modelId,
        partialContent: `${currentContent}${event.delta ?? ""}`,
      });
    case "checkpoint": {
      const checkpointContent = event.content ?? currentContent;
      return updateAssistantMessage(currentMessages, conversationId, event, {
        status: "generating",
        model: event.modelId,
        partialContent: checkpointContent,
      });
    }
    case "complete": {
      const completeContent = event.content ?? currentContent;
      return updateAssistantMessage(currentMessages, conversationId, event, {
        status: "complete",
        model: event.modelId,
        content: completeContent,
        partialContent: undefined,
        error: undefined,
      });
    }
    case "cancelled": {
      const cancelledContent = event.content ?? currentContent;
      return updateAssistantMessage(currentMessages, conversationId, event, {
        status: "stopped",
        model: event.modelId,
        content: cancelledContent,
        partialContent: cancelledContent || undefined,
        error: undefined,
      });
    }
    case "error": {
      const errorContent = event.content ?? currentContent;
      return updateAssistantMessage(currentMessages, conversationId, event, {
        status: "error",
        model: event.modelId,
        content: errorContent,
        partialContent: errorContent || undefined,
        error: event.error ?? "Generation failed",
      });
    }
    default:
      return currentMessages;
  }
}

export function useMessages(
  conversationId: () => Id<"conversations">,
  requestId: () => string | null = () => null,
) {
  const [data, setData] = createSignal<Message[] | null>();
  const [error, setError] = createSignal<Error | null>(null);

  createEffect(() => {
    const id = conversationId();
    const explicitRequestId = requestId();
    const client = requireClient();
    const apiKey = requireApiKey();
    const abortController = new AbortController();
    let disposed = false;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const pollOnce = async () => {
      const messages = await listMessages(client, apiKey, id);
      if (!disposed) {
        setData(messages);
        setError(null);
      }
    };

    const startFallbackPolling = () => {
      if (fallbackInterval) {
        return;
      }

      fallbackInterval = setInterval(async () => {
        try {
          await pollOnce();
        } catch (err) {
          if (!disposed) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      }, 1200);
    };

    setError(null);

    pollOnce().catch((err) => {
      if (!disposed) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    });

    (async () => {
      try {
        const activeGeneration = explicitRequestId
          ? {
              requestId: explicitRequestId,
            }
          : await getActiveGeneration(client, apiKey, id);
        const activeRequestId = activeGeneration?.requestId;

        if (!activeRequestId) {
          return;
        }

        for await (const event of client.streamCliGeneration(activeRequestId, {
          signal: abortController.signal,
        })) {
          if (disposed) {
            break;
          }

          if (event.event === "generation") {
            setData((current) => applyGenerationEvent(current, id, event.data));
            setError(null);
          }

          const generationEvent = event.data;
          if (
            generationEvent.type === "complete" ||
            generationEvent.type === "cancelled" ||
            generationEvent.type === "error"
          ) {
            await pollOnce();
          }
        }

        if (!disposed) {
          await pollOnce();
        }
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err : new Error(String(err)));
          startFallbackPolling();
        }
      }
    })();

    onCleanup(() => {
      disposed = true;
      abortController.abort();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    });
  });

  return {
    data,
    error,
    isLoading: () => data() === undefined && error() === null,
  };
}
