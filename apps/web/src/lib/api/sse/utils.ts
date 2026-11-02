/**
 * Server-Sent Events (SSE) utilities
 *
 * Provides helpers for creating SSE responses with:
 * - Bounded ReadableStream buffering
 * - Heartbeat keep-alive (prevents carrier disconnection)
 * - Proper event formatting
 * - Cleanup on disconnect
 */

export interface SSEConnection {
  response: Response;
  send: (event: string, data: unknown) => Promise<void>;
  sendError: (error: Error | string) => Promise<void>;
  close: () => Promise<void>;
  isClosed: () => boolean;
}

/**
 * Create SSE response with streaming capabilities
 *
 * Usage:
 * ```typescript
 * const { response, send, close } = createSSEResponse();
 * await send("snapshot", { data: [...] });
 * await send("update", { data: [...] });
 * ```
 */
export function createSSEResponse(
  maxBufferedBytes = 32 * 1024 * 1024,
): SSEConnection {
  const encoder = new TextEncoder();
  let closed = false;
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>(
    {
      start(value) {
        controller = value;
      },
      cancel() {
        closed = true;
      },
    },
    { highWaterMark: maxBufferedBytes, size: (chunk) => chunk.byteLength },
  );
  const enqueue = (payload: string) => {
    const bytes = encoder.encode(payload);
    if (bytes.byteLength > (controller.desiredSize ?? 0)) {
      closed = true;
      controller.error(
        new Error("SSE client is too slow; reconnect for a fresh snapshot"),
      );
      return;
    }
    controller.enqueue(bytes);
  };

  return {
    response: new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    }),

    send: async (event: string, data: unknown) => {
      if (closed) return;

      try {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        enqueue(payload);
      } catch (_error) {
        // Client disconnected
        closed = true;
      }
    },

    sendError: async (error: Error | string) => {
      if (closed) return;

      const errorMessage = error instanceof Error ? error.message : error;
      const payload = `event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`;

      try {
        enqueue(payload);
      } catch (_err) {
        closed = true;
      }
    },

    close: async () => {
      if (closed) return;

      closed = true;
      try {
        controller.close();
      } catch (_error) {
        // Already closed
      }
    },

    isClosed: () => closed,
  };
}

/**
 * Create heartbeat loop to keep SSE connection alive
 *
 * Mobile carriers disconnect idle connections after 5-10 minutes.
 * Heartbeat every 2 minutes prevents disconnection.
 *
 * Usage:
 * ```typescript
 * const heartbeat = createHeartbeatLoop(send, 120_000);
 * // ... on cleanup:
 * clearInterval(heartbeat);
 * ```
 *
 * @param send - SSE send function
 * @param interval - Interval in milliseconds (default: 120s = 2min)
 * @returns Interval ID for cleanup
 */
export function createHeartbeatLoop(
  send: (event: string, data: unknown) => Promise<void>,
  interval = 120_000,
): NodeJS.Timeout {
  return setInterval(() => {
    send("heartbeat", { ts: Date.now() }).catch(() => {
      // Client disconnected, interval will be cleared by caller
    });
  }, interval);
}

/**
 * Format SSE event string
 *
 * Utility for manual event construction if needed.
 */
export function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create polling interval with error handling
 *
 * Used by SSE endpoints to poll Convex for updates.
 *
 * @param pollFn - Async function to poll
 * @param send - SSE send function
 * @param interval - Poll interval in milliseconds
 * @param eventName - SSE event name (default: "update")
 * @returns Interval ID for cleanup
 */
export function createPollingLoop(
  pollFn: () => Promise<unknown>,
  send: (event: string, data: unknown) => Promise<void>,
  interval: number,
  eventName = "update",
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const data = await pollFn();
      if (data !== null) await send(eventName, data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Poll failed";
      await send("error", { error: errorMessage }).catch(() => {
        // Client disconnected
      });
    }
  }, interval);
}

/**
 * Setup cleanup handler for SSE connection
 *
 * Handles:
 * - Request abort signal
 * - Clearing intervals (heartbeat, polling)
 * - Closing SSE connection
 *
 * Usage:
 * ```typescript
 * const cleanup = setupSSECleanup(req.signal, close, [heartbeat, pollInterval]);
 * ```
 */
export function setupSSECleanup(
  signal: AbortSignal,
  close: () => Promise<void>,
  intervals: NodeJS.Timeout[],
): void {
  signal.addEventListener("abort", () => {
    intervals.forEach((interval) => clearInterval(interval));
    close().catch(() => {
      // Already closed
    });
  });
}
