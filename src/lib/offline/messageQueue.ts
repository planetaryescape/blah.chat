import type { Id } from "@/convex/_generated/dataModel";

/**
 * Queued message for offline mode
 * Persisted in localStorage, sent when online
 */
export interface QueuedMessage {
  id: string;
  conversationId: Id<"conversations">;
  content: string;
  modelId?: string;
  models?: string[];
  attachments?: Array<{
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
  }>;
  timestamp: number;
  retries: number;
}

/**
 * Offline message queue with localStorage persistence
 * Auto-retries when connection restored with exponential backoff
 */
export class MessageQueue {
  private readonly STORAGE_KEY = "blah-chat-offline-queue";
  private readonly MAX_RETRIES = 3;

  /**
   * Add message to offline queue
   */
  enqueue(message: Omit<QueuedMessage, "id" | "timestamp" | "retries">): void {
    const queue = this.getQueue();

    const queuedMessage: QueuedMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    queue.push(queuedMessage);
    this.persist(queue);

    // Dispatch event for UI update
    this.dispatchQueueUpdate();
  }

  /**
   * Process all queued messages with exponential backoff retry
   */
  async processQueue(
    sendFn: (msg: QueuedMessage) => Promise<void>,
  ): Promise<void> {
    const queue = this.getQueue();

    for (const msg of queue) {
      try {
        await sendFn(msg);

        // Success - remove from queue
        this.remove(msg.id);
      } catch (_error) {
        // Failed - increment retry count
        if (msg.retries >= this.MAX_RETRIES) {
          // Max retries exceeded - remove permanently
          this.remove(msg.id);
          console.error(
            `[MessageQueue] Permanently failed after ${this.MAX_RETRIES} retries:`,
            msg.content.slice(0, 50),
          );
        } else {
          // Increment retry count
          this.incrementRetry(msg.id);

          // Exponential backoff: 2s → 4s → 8s
          const backoffMs = 2000 * 2 ** msg.retries;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  /**
   * Get all queued messages
   */
  getQueue(): QueuedMessage[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("[MessageQueue] Failed to read queue:", error);
      return [];
    }
  }

  /**
   * Get queue count for UI display
   */
  getCount(): number {
    return this.getQueue().length;
  }

  /**
   * Clear entire queue (for manual reset)
   */
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.dispatchQueueUpdate();
  }

  // Private helpers

  private persist(queue: QueuedMessage[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("[MessageQueue] Failed to persist queue:", error);
    }
  }

  private remove(id: string): void {
    const queue = this.getQueue().filter((m) => m.id !== id);
    this.persist(queue);
    this.dispatchQueueUpdate();
  }

  private incrementRetry(id: string): void {
    const queue = this.getQueue();
    const msg = queue.find((m) => m.id === id);

    if (msg) {
      msg.retries++;
      this.persist(queue);
    }
  }

  private dispatchQueueUpdate(): void {
    window.dispatchEvent(
      new CustomEvent("queue-updated", {
        detail: { count: this.getCount() },
      }),
    );
  }
}

/**
 * Singleton instance for app-wide use
 */
export const messageQueue = new MessageQueue();
