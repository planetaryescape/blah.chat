import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { cache } from "@/lib/cache";

/**
 * Queued message for offline mode
 * Persisted in IndexedDB via Dexie, sent when online
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
 * Offline message queue with IndexedDB persistence (via Dexie)
 * Auto-retries when connection restored with exponential backoff
 */
export class MessageQueue {
  private readonly MAX_RETRIES = 3;

  /**
   * Add message to offline queue
   * @throws Error if IndexedDB write fails (e.g., quota exceeded)
   */
  async enqueue(
    message: Omit<QueuedMessage, "id" | "timestamp" | "retries">,
  ): Promise<void> {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    await cache.pendingMutations.add({
      _id: queuedMessage.id,
      type: "sendMessage",
      payload: queuedMessage,
      createdAt: Date.now(),
      retries: 0,
    });

    // Dispatch event for UI update
    this.dispatchQueueUpdate();
  }

  /**
   * Process all queued messages with exponential backoff retry
   */
  async processQueue(
    sendFn: (msg: QueuedMessage) => Promise<void>,
  ): Promise<void> {
    const queue = await this.getQueue();

    for (const msg of queue) {
      try {
        await sendFn(msg);

        // Success - remove from queue
        await this.remove(msg.id);
      } catch (_error) {
        // Failed - increment retry count
        if (msg.retries >= this.MAX_RETRIES) {
          // Max retries exceeded - remove permanently
          await this.remove(msg.id);
          console.error(
            `[MessageQueue] Permanently failed after ${this.MAX_RETRIES} retries:`,
            msg.content.slice(0, 50),
          );
        } else {
          // Increment retry count
          await this.incrementRetry(msg.id);

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
  async getQueue(): Promise<QueuedMessage[]> {
    try {
      const pending = await cache.pendingMutations
        .where("type")
        .equals("sendMessage")
        .toArray();
      return pending.map((p) => p.payload as QueuedMessage);
    } catch (error) {
      console.error("[MessageQueue] Failed to read queue:", error);
      return [];
    }
  }

  async getCount(): Promise<number> {
    try {
      return await cache.pendingMutations
        .where("type")
        .equals("sendMessage")
        .count();
    } catch {
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      await cache.pendingMutations.clear();
    } catch (error) {
      console.error("[MessageQueue] Failed to clear queue:", error);
    }
    this.dispatchQueueUpdate();
  }

  // Private helpers

  private async remove(id: string): Promise<void> {
    try {
      await cache.pendingMutations.delete(id);
    } catch (error) {
      console.error("[MessageQueue] Failed to remove:", error);
    }
    this.dispatchQueueUpdate();
  }

  private async incrementRetry(id: string): Promise<void> {
    try {
      const mutation = await cache.pendingMutations.get(id);
      if (mutation) {
        const payload = mutation.payload as QueuedMessage;
        payload.retries++;
        await cache.pendingMutations.put({
          ...mutation,
          payload,
          retries: mutation.retries + 1,
        });
      }
    } catch (error) {
      console.error("[MessageQueue] Failed to increment retry:", error);
    }
  }

  private dispatchQueueUpdate(): void {
    // Get count async and dispatch
    this.getCount().then((count) => {
      window.dispatchEvent(
        new CustomEvent("queue-updated", {
          detail: { count },
        }),
      );
    });
  }
}

/**
 * Singleton instance for app-wide use
 */
export const messageQueue = new MessageQueue();
