/**
 * Server-Sent Events (SSE) utilities for Tier 2 operations
 * Tier 2: Medium-duration operations (5-30s) with real-time progress
 */

export interface ProgressUpdate {
  current: number; // 0-100
  message: string; // "Processing chunk 3/10"
  eta?: number; // Estimated completion timestamp
}

/**
 * SSE stream manager
 * Handles event formatting and stream management
 */
export class SSEStream {
  private controller: ReadableStreamDefaultController;
  private encoder = new TextEncoder();

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller;
  }

  /**
   * Send generic event
   */
  send(data: any, event?: string) {
    const message = event
      ? `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      : `data: ${JSON.stringify(data)}\n\n`;

    this.controller.enqueue(this.encoder.encode(message));
  }

  /**
   * Send progress update
   */
  sendProgress(jobId: string, progress: ProgressUpdate) {
    this.send({ jobId, ...progress }, "progress");
  }

  /**
   * Send completion event
   */
  sendComplete(jobId: string, result: any) {
    this.send({ jobId, result }, "complete");
  }

  /**
   * Send error event
   */
  sendError(jobId: string, error: string | { message: string; code?: string }) {
    const errorData = typeof error === "string" ? { message: error } : error;
    this.send({ jobId, error: errorData }, "error");
  }

  /**
   * Send heartbeat (keep-alive)
   */
  sendHeartbeat() {
    this.send({ timestamp: Date.now() }, "ping");
  }

  /**
   * Close the stream
   */
  close() {
    this.controller.close();
  }
}

/**
 * Create SSE response
 * Returns Response with proper headers for SSE streaming
 *
 * Usage:
 * ```ts
 * return createSSEResponse(async (stream) => {
 *   stream.sendProgress(jobId, { current: 50, message: "Half done" });
 *   const result = await doWork();
 *   stream.sendComplete(jobId, result);
 * });
 * ```
 */
export function createSSEResponse(
  handler: (stream: SSEStream) => Promise<void>,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const sse = new SSEStream(controller);

      try {
        await handler(sse);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        sse.sendError("unknown", errorMessage);
      } finally {
        sse.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

/**
 * Create heartbeat interval
 * Prevents connection timeout on mobile carriers (typically 5-10min idle timeout)
 *
 * Returns cleanup function
 */
export function createHeartbeat(
  stream: SSEStream,
  intervalMs: number = 30000, // 30s default
): () => void {
  const interval = setInterval(() => {
    stream.sendHeartbeat();
  }, intervalMs);

  return () => clearInterval(interval);
}
