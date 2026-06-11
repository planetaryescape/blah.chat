import { cache } from "@/lib/cache";

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  modelId?: string;
  models?: string[];
  parentMessageId?: string;
  clientMessageId?: string;
  thinkingEffort?: "none" | "low" | "medium" | "high";
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

    this.dispatchQueueUpdate();
  }

  async processQueue(
    sendFn: (msg: QueuedMessage) => Promise<void>,
  ): Promise<{ sent: QueuedMessage[]; failed: QueuedMessage[] }> {
    const queue = await this.getQueue();
    const sent: QueuedMessage[] = [];
    const failed: QueuedMessage[] = [];

    for (const msg of queue) {
      try {
        await sendFn(msg);
        await this.remove(msg.id);
        sent.push(msg);
      } catch (error) {
        // Client errors won't succeed on retry (e.g. 404: conversation was
        // deleted while the message sat in the queue). Drop immediately and
        // report so the user isn't silently losing messages.
        const status =
          error && typeof error === "object" && "status" in error
            ? (error as { status?: unknown }).status
            : undefined;
        const isPermanent =
          typeof status === "number" &&
          status >= 400 &&
          status < 500 &&
          status !== 408 &&
          status !== 429;

        if (isPermanent || msg.retries >= this.MAX_RETRIES) {
          await this.remove(msg.id);
          failed.push(msg);
          console.error(
            "[MessageQueue] Permanently failed:",
            msg.content.slice(0, 50),
          );
        } else {
          await this.incrementRetry(msg.id);

          // Exponential backoff: 2s → 4s → 8s
          const backoffMs = 2000 * 2 ** msg.retries;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    return { sent, failed };
  }

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
