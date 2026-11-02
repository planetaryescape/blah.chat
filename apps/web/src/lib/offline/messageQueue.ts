import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { getCache } from "@/lib/cache";
import { type BlahChatCache, getActiveCache } from "@/lib/cache/db";

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

export class MessageQueue {
  private readonly MAX_RETRIES = 3;

  async enqueue(
    message: Omit<QueuedMessage, "id" | "timestamp" | "retries">,
    cache: BlahChatCache | null = getActiveCache(),
  ): Promise<boolean> {
    if (!cache || getActiveCache() !== cache) return false;
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

    this.dispatchQueueUpdate();
    return getActiveCache() === cache;
  }

  async processQueue(
    sendFn: (msg: QueuedMessage) => Promise<void>,
    cache: BlahChatCache | null = getActiveCache(),
  ): Promise<"complete" | "cancelled" | "incomplete"> {
    if (!cache || getActiveCache() !== cache) return "cancelled";
    const pending = await cache.pendingMutations
      .where("type")
      .equals("sendMessage")
      .toArray();
    // SAFETY: owner-scoped sendMessage rows are produced by enqueue above.
    const queue = pending.map((mutation) => mutation.payload as QueuedMessage);
    let incomplete = false;

    for (const msg of queue) {
      // Never replay an old account's pending writes after an identity change.
      if (getActiveCache() !== cache) return "cancelled";
      try {
        await sendFn(msg);
        if (getActiveCache() !== cache) return "cancelled";
        await this.remove(cache, msg.id);
      } catch (_error) {
        if (getActiveCache() !== cache) return "cancelled";
        incomplete = true;
        if (msg.retries >= this.MAX_RETRIES) {
          await this.remove(cache, msg.id);
          console.error(
            `[MessageQueue] Permanently failed after ${this.MAX_RETRIES} retries:`,
          );
        } else {
          await this.incrementRetry(cache, msg.id);

          // Exponential backoff: 2s → 4s → 8s
          const backoffMs = 2000 * 2 ** msg.retries;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
    if (getActiveCache() !== cache) return "cancelled";
    return incomplete ? "incomplete" : "complete";
  }

  async getQueue(): Promise<QueuedMessage[]> {
    try {
      const cache = getCache();
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
      const cache = getCache();
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
      const cache = getCache();
      await cache.pendingMutations.clear();
    } catch (error) {
      console.error("[MessageQueue] Failed to clear queue:", error);
    }
    this.dispatchQueueUpdate();
  }

  private async remove(cache: BlahChatCache, id: string): Promise<void> {
    try {
      await cache.pendingMutations.delete(id);
    } catch (error) {
      console.error("[MessageQueue] Failed to remove:", error);
    }
    this.dispatchQueueUpdate();
  }

  private async incrementRetry(
    cache: BlahChatCache,
    id: string,
  ): Promise<void> {
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
    this.getCount().then((count) => {
      window.dispatchEvent(
        new CustomEvent("queue-updated", {
          detail: { count },
        }),
      );
    });
  }
}

export const messageQueue = new MessageQueue();
