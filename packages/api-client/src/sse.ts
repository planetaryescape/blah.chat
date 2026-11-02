import { createParser, type EventSourceMessage } from "eventsource-parser";

export type SSEEventName = "snapshot" | "update" | "error" | "heartbeat";

export interface SSEEvent<T = unknown> {
  event: SSEEventName;
  data: T;
}

export interface SSEStreamOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  fetch?: typeof fetch;
}

export async function* streamSSE<T = unknown>(
  url: string,
  options: SSEStreamOptions = {},
): AsyncGenerator<SSEEvent<T>, void, undefined> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...options.headers,
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`SSE request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("SSE response has no body");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  const queue: SSEEvent<T>[] = [];

  const parser = createParser({
    onEvent: (event: EventSourceMessage) => {
      const name = (event.event || "update") as SSEEventName;
      if (
        name !== "snapshot" &&
        name !== "update" &&
        name !== "error" &&
        name !== "heartbeat"
      ) {
        return;
      }

      try {
        queue.push({
          event: name,
          data: event.data ? (JSON.parse(event.data) as T) : ({} as T),
        });
      } catch {
        queue.push({ event: name, data: { raw: event.data } as unknown as T });
      }
    },
    onError: (parseError: unknown) => {
      throw new Error(String(parseError));
    },
  });

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      while (queue.length > 0) {
        const nextEvent = queue.shift();
        if (nextEvent) {
          yield nextEvent;
        }
      }
      return;
    }

    parser.feed(decoder.decode(value, { stream: true }));

    while (queue.length > 0) {
      const nextEvent = queue.shift();
      if (nextEvent) {
        yield nextEvent;
      }
    }
  }
}
