import { createEffect, createSignal, onCleanup } from "solid-js";
import { requireApiKey, requireClient } from "../lib/client.js";
import type { Message } from "../lib/queries.js";
import { listMessages } from "../lib/queries.js";
import type { Id } from "../lib/types.js";

export function useMessages(conversationId: () => Id<"conversations">) {
  const [data, setData] = createSignal<Message[] | null>();
  const [error, setError] = createSignal<Error | null>(null);

  createEffect(() => {
    const id = conversationId();
    const client = requireClient();
    const apiKey = requireApiKey();
    const abortController = new AbortController();
    let disposed = false;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const pollOnce = async () => {
      const messages = await listMessages(client, apiKey, id);
      if (!disposed) {
        setData(messages);
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
        for await (const event of client.streamCliMessages(id, {
          signal: abortController.signal,
        })) {
          if (disposed) {
            break;
          }

          if (event.event === "snapshot" || event.event === "update") {
            const messages = (event.data as { messages?: Message[] })?.messages;
            if (Array.isArray(messages)) {
              setData(messages);
              setError(null);
            }
          }
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
