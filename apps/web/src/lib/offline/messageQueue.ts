import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { getCache } from "@/lib/cache";
import { type BlahChatCache, getActiveCache } from "@/lib/cache/db";

export interface QueuedMessage {
  id: string;
  conversationId: Id<"conversations">;
  content: string;
  modelId?: string;
  models?: string[];
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

export interface ReplayableQueuedMessage extends QueuedMessage {
  clientMessageId: string;
}

const REPLAYABLE_SEND_TYPE = "sendMessageV2" as const;
const THINKING_EFFORTS = new Set<unknown>(["none", "low", "medium", "high"]);
const ATTACHMENT_TYPES = new Set<unknown>(["file", "image", "audio"]);

export class MessageQueue {
  private readonly MAX_RETRIES = 3;
  private readonly processing = new WeakSet<BlahChatCache>();

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

  async enqueueReplayable(
    message: Omit<ReplayableQueuedMessage, "id" | "timestamp" | "retries">,
    cache: BlahChatCache | null = getActiveCache(),
  ): Promise<ReplayableQueuedMessage | null> {
    if (!cache || getActiveCache() !== cache) return null;
    if (!message.clientMessageId || message.clientMessageId.length > 256)
      throw new Error("A stable request key is required for replayable sends");
    const queuedMessage: ReplayableQueuedMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };
    await cache.pendingMutations.add({
      _id: queuedMessage.id,
      type: REPLAYABLE_SEND_TYPE,
      payload: queuedMessage,
      createdAt: queuedMessage.timestamp,
      retries: 0,
    });
    if (getActiveCache() !== cache) {
      // The transport has not started, so this captured owner's just-written row
      // can be removed without affecting another cache or a possibly accepted send.
      await cache.pendingMutations.delete(queuedMessage.id);
      return null;
    }
    this.dispatchQueueUpdate();
    return queuedMessage;
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

  async processReplayableQueue(
    sendFn: (msg: ReplayableQueuedMessage) => Promise<unknown>,
    cache: BlahChatCache | null = getActiveCache(),
  ): Promise<"complete" | "cancelled" | "incomplete"> {
    if (!cache || getActiveCache() !== cache) return "cancelled";
    if (this.processing.has(cache)) return "incomplete";
    this.processing.add(cache);
    try {
      const pending = await cache.pendingMutations
        .where("type")
        .equals(REPLAYABLE_SEND_TYPE)
        .toArray();
      let incomplete = false;
      for (const row of pending) {
        if (getActiveCache() !== cache) return "cancelled";
        if (row.type !== REPLAYABLE_SEND_TYPE) continue;
        const message = parseReplayableMessage(row.payload);
        if (!message) {
          await this.markAttention(
            cache,
            row._id,
            "Stored send could not be read.",
          );
          incomplete = true;
          continue;
        }
        if (row.state === "attention") {
          incomplete = true;
          continue;
        }
        try {
          await sendFn(message);
          if (getActiveCache() !== cache) return "cancelled";
          await this.remove(cache, message.id);
        } catch (error) {
          if (getActiveCache() !== cache) return "cancelled";
          incomplete = true;
          if (isDefinitiveRefusal(error)) {
            await this.markAttention(
              cache,
              message.id,
              "The server refused this send. Review it before retrying.",
            );
          } else {
            const retries = Math.min(message.retries + 1, this.MAX_RETRIES);
            if (retries >= this.MAX_RETRIES) {
              await this.markAttention(
                cache,
                message.id,
                "The send outcome is still unknown. Retry this same request to check safely.",
                retries,
              );
            } else {
              await this.updateReplayable(cache, message.id, {
                retries,
              });
            }
          }
        }
      }
      if (getActiveCache() !== cache) return "cancelled";
      return incomplete ? "incomplete" : "complete";
    } finally {
      this.processing.delete(cache);
    }
  }

  async acknowledgeReplayable(
    id: string,
    cache: BlahChatCache | null,
  ): Promise<boolean> {
    if (!cache || getActiveCache() !== cache) return false;
    const row = await cache.pendingMutations.get(id);
    if (!row || row.type !== REPLAYABLE_SEND_TYPE) return false;
    await cache.pendingMutations.delete(id);
    this.dispatchQueueUpdate();
    return getActiveCache() === cache;
  }

  async retryAttention(
    id: string,
    cache: BlahChatCache | null = getActiveCache(),
  ): Promise<boolean> {
    if (!cache || getActiveCache() !== cache) return false;
    const row = await cache.pendingMutations.get(id);
    if (!row || row.type !== REPLAYABLE_SEND_TYPE) return false;
    const message = parseReplayableMessage(row.payload);
    if (!message) return false;
    await cache.pendingMutations.put({
      ...row,
      state: "pending",
      error: undefined,
      retries: 0,
      payload: { ...message, retries: 0 },
    });
    this.dispatchQueueUpdate();
    return getActiveCache() === cache;
  }

  async retryAllAttention(
    cache: BlahChatCache | null = getActiveCache(),
  ): Promise<number> {
    if (!cache || getActiveCache() !== cache) return 0;
    const rows = await cache.pendingMutations
      .where("type")
      .equals(REPLAYABLE_SEND_TYPE)
      .toArray();
    let retried = 0;
    for (const row of rows) {
      if (
        row.state === "attention" &&
        (await this.retryAttention(row._id, cache))
      ) {
        retried++;
      }
    }
    return retried;
  }

  async getQueue(): Promise<QueuedMessage[]> {
    try {
      const cache = getCache();
      const pending = await cache.pendingMutations
        .where("type")
        .anyOf("sendMessage", REPLAYABLE_SEND_TYPE)
        .toArray();
      return pending.flatMap((row) => {
        if (row.type === REPLAYABLE_SEND_TYPE) {
          const parsed = parseReplayableMessage(row.payload);
          return parsed ? [parsed] : [];
        }
        return [row.payload as QueuedMessage];
      });
    } catch (error) {
      console.error("[MessageQueue] Failed to read queue:", error);
      return [];
    }
  }

  async getCount(
    cache: BlahChatCache | null = getActiveCache(),
  ): Promise<number> {
    try {
      if (!cache || getActiveCache() !== cache) return 0;
      return await cache.pendingMutations
        .where("type")
        .anyOf("sendMessage", REPLAYABLE_SEND_TYPE)
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

  private async updateReplayable(
    cache: BlahChatCache,
    id: string,
    updates: {
      retries?: number;
      state?: "pending" | "attention";
      error?: string;
    },
  ): Promise<void> {
    const row = await cache.pendingMutations.get(id);
    if (!row || row.type !== REPLAYABLE_SEND_TYPE) return;
    const message = parseReplayableMessage(row.payload);
    await cache.pendingMutations.put({
      ...row,
      ...updates,
      payload: message
        ? { ...message, retries: updates.retries ?? message.retries }
        : row.payload,
      retries: updates.retries ?? row.retries,
    });
    this.dispatchQueueUpdate();
  }

  private markAttention(
    cache: BlahChatCache,
    id: string,
    reason: string,
    retries?: number,
  ): Promise<void> {
    return this.updateReplayable(cache, id, {
      state: "attention",
      error: reason,
      ...(retries !== undefined && { retries }),
    });
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

function parseReplayableMessage(
  value: unknown,
): ReplayableQueuedMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "string" ||
    typeof message.conversationId !== "string" ||
    typeof message.content !== "string" ||
    typeof message.clientMessageId !== "string" ||
    message.clientMessageId.length === 0 ||
    message.clientMessageId.length > 256 ||
    typeof message.timestamp !== "number" ||
    typeof message.retries !== "number"
  ) {
    return null;
  }
  if (message.modelId !== undefined && typeof message.modelId !== "string") {
    return null;
  }
  if (
    message.models !== undefined &&
    (!Array.isArray(message.models) ||
      message.models.some((model) => typeof model !== "string"))
  ) {
    return null;
  }
  if (
    message.thinkingEffort !== undefined &&
    !THINKING_EFFORTS.has(message.thinkingEffort)
  ) {
    return null;
  }
  if (
    message.attachments !== undefined &&
    (!Array.isArray(message.attachments) ||
      message.attachments.some((attachment) => {
        if (!attachment || typeof attachment !== "object") return true;
        const item = attachment as Record<string, unknown>;
        return (
          !ATTACHMENT_TYPES.has(item.type) ||
          typeof item.name !== "string" ||
          typeof item.storageId !== "string" ||
          typeof item.mimeType !== "string" ||
          typeof item.size !== "number"
        );
      }))
  ) {
    return null;
  }
  return message as unknown as ReplayableQueuedMessage;
}

export function isDefinitiveRefusal(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("status" in error)) return false;
  const status = error.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

export const messageQueue = new MessageQueue();
