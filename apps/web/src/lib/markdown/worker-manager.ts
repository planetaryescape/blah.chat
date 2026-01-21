/**
 * Worker Manager for Markdown Parsing
 *
 * Singleton that manages the markdown worker lifecycle:
 * - Lazy initialization (only when first needed)
 * - Promise-based request/response with timeout
 * - Graceful fallback when worker unavailable
 */

interface WorkerRequest {
  id: string;
  content: string;
}

interface WorkerResponse {
  id: string;
  html: string;
  duration: number;
  error?: string;
}

interface PendingRequest {
  resolve: (html: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const WORKER_TIMEOUT_MS = 5000;

class MarkdownWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private initError: Error | null = null;

  /**
   * Check if workers are supported in current environment
   */
  private get isSupported(): boolean {
    return typeof window !== "undefined" && typeof Worker !== "undefined";
  }

  /**
   * Initialize the worker
   */
  private async initialize(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    if (this.initError) throw this.initError;

    if (!this.isSupported) {
      this.initError = new Error("Workers not supported");
      throw this.initError;
    }

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        // Create worker from the worker file
        // Note: Next.js bundles this correctly with the Worker constructor
        this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
          type: "module",
        });

        const onReady = (event: MessageEvent) => {
          if (event.data?.type === "ready") {
            this.isReady = true;
            this.worker?.removeEventListener("message", onReady);
            resolve();
          }
        };

        this.worker.addEventListener("message", onReady);
        this.worker.addEventListener("message", this.handleMessage.bind(this));
        this.worker.addEventListener("error", this.handleError.bind(this));

        // Timeout for initialization
        setTimeout(() => {
          if (!this.isReady) {
            this.initError = new Error("Worker initialization timeout");
            this.terminate();
            reject(this.initError);
          }
        }, 10000);
      } catch (error) {
        this.initError =
          error instanceof Error ? error : new Error("Worker init failed");
        reject(this.initError);
      }
    });

    return this.readyPromise;
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, html, error } = event.data;

    // Skip ready messages
    if ((event.data as { type?: string }).type === "ready") return;

    const pending = this.pendingRequests.get(id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(id);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(html);
    }
  }

  /**
   * Handle worker errors
   */
  private handleError(event: ErrorEvent): void {
    console.error("[WorkerManager] Worker error:", event.message);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Worker error"));
      this.pendingRequests.delete(id);
    }

    // Terminate and reset for potential retry
    this.terminate();
  }

  /**
   * Parse markdown content using the worker
   * Returns null if worker is unavailable (caller should fallback to Streamdown)
   */
  async parse(content: string): Promise<string | null> {
    try {
      await this.initialize();
    } catch {
      return null;
    }

    if (!this.worker || !this.isReady) return null;

    const id = `${++this.requestCounter}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("Worker timeout"));
      }, WORKER_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.worker!.postMessage({ id, content } satisfies WorkerRequest);
    });
  }

  /**
   * Terminate the worker and cleanup
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Worker terminated"));
    }
    this.pendingRequests.clear();

    this.isReady = false;
    this.readyPromise = null;
    this.initError = null;
  }

  /**
   * Check if the worker is ready
   */
  get ready(): boolean {
    return this.isReady;
  }
}

// Singleton instance
let instance: MarkdownWorkerManager | null = null;

export function getMarkdownWorker(): MarkdownWorkerManager {
  if (!instance) {
    instance = new MarkdownWorkerManager();
  }
  return instance;
}

/**
 * Parse markdown using the worker
 * Returns null if worker is unavailable (SSR, init failure, timeout)
 */
export async function parseMarkdownInWorker(
  content: string,
): Promise<string | null> {
  const worker = getMarkdownWorker();
  try {
    return await worker.parse(content);
  } catch (error) {
    console.warn("[WorkerManager] Parse failed, falling back:", error);
    return null;
  }
}
