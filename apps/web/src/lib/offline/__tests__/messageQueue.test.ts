import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BlahChatCache,
  type PendingMutation,
  setActiveCache,
} from "@/lib/cache/db";
import { MessageQueue, type QueuedMessage } from "../messageQueue";

function fixture(user: string) {
  const cache = new BlahChatCache(user);
  const rows = new Map<string, PendingMutation>();
  Object.defineProperty(cache, "pendingMutations", {
    value: {
      add: async (row: PendingMutation) => rows.set(row._id, row),
      get: async (id: string) => rows.get(id),
      put: async (row: PendingMutation) => rows.set(row._id, row),
      delete: async (id: string) => rows.delete(id),
      where: (field: keyof PendingMutation) => ({
        equals: (value: unknown) => ({
          toArray: async () =>
            [...rows.values()].filter((row) => row[field] === value),
          count: async () =>
            [...rows.values()].filter((row) => row[field] === value).length,
        }),
        anyOf: (...values: unknown[]) => ({
          toArray: async () =>
            [...rows.values()].filter((row) => values.includes(row[field])),
          count: async () =>
            [...rows.values()].filter((row) => values.includes(row[field]))
              .length,
        }),
      }),
    },
  });
  return { cache, rows };
}

// SAFETY: synthetic IDs stay inside this queue fixture, never reaching a backend.
const message = {
  conversationId: "conversation-A" as Id<"conversations">,
  content: "private queued message",
};

afterEach(() => setActiveCache(null));

describe("offline queue ownership", () => {
  it("persists and replays a complete send through IndexedDB, retaining uncertainty and allowing same-key retry", async () => {
    const cache = new BlahChatCache(`indexeddb-${crypto.randomUUID()}`);
    const queue = new MessageQueue();
    await cache.open();
    setActiveCache(cache);
    const input = {
      ...message,
      clientMessageId: "stable-indexeddb-key",
      modelId: "model-a",
      thinkingEffort: "medium" as const,
      attachments: [
        {
          type: "image" as const,
          name: "diagram.png",
          storageId: "storage-1",
          mimeType: "image/png",
          size: 128,
        },
      ],
    };
    const queued = await queue.enqueueReplayable(input);
    expect(queued).not.toBeNull();
    const row = await cache.pendingMutations.get(queued!.id);
    expect(row).toMatchObject({
      type: "sendMessageV2",
      payload: input,
    });

    await expect(
      queue.processReplayableQueue(async () => {
        throw new Error("connection lost after server accepted");
      }),
    ).resolves.toBe("incomplete");
    expect(await cache.pendingMutations.get(queued!.id)).toMatchObject({
      type: "sendMessageV2",
      payload: {
        clientMessageId: "stable-indexeddb-key",
        attachments: input.attachments,
        retries: 1,
      },
      retries: 1,
    });

    const send = vi.fn(async (replayed) => {
      expect(replayed.clientMessageId).toBe("stable-indexeddb-key");
      return { accepted: true };
    });
    await expect(queue.processReplayableQueue(send)).resolves.toBe("complete");
    expect(send).toHaveBeenCalledTimes(1);
    expect(await cache.pendingMutations.get(queued!.id)).toBeUndefined();
    setActiveCache(null);
    cache.close();
    await cache.delete();
  });

  it("leaves replayable rows untouched when account ownership changes during transport", async () => {
    const a = fixture("indexeddb-owner-a");
    const b = fixture("indexeddb-owner-b");
    const queue = new MessageQueue();
    setActiveCache(a.cache);
    const queued = await queue.enqueueReplayable({
      ...message,
      clientMessageId: "owner-fenced-key",
    });
    const send = vi.fn(async () => {
      setActiveCache(b.cache);
      return {};
    });
    await expect(queue.processReplayableQueue(send, a.cache)).resolves.toBe(
      "cancelled",
    );
    expect(await a.cache.pendingMutations.get(queued!.id)).toBeDefined();
    expect(b.rows.size).toBe(0);
  });

  it("moves repeated uncertain outcomes to attention without dropping the request", async () => {
    const a = fixture("retry-limit");
    const queue = new MessageQueue();
    setActiveCache(a.cache);
    const queued = await queue.enqueueReplayable({
      ...message,
      clientMessageId: "retry-limit-key",
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      await queue.processReplayableQueue(async () => {
        throw new Error("network failure");
      });
    }
    expect(a.rows.get(queued!.id)).toMatchObject({
      type: "sendMessageV2",
      state: "attention",
      retries: 3,
      payload: { clientMessageId: "retry-limit-key", retries: 3 },
    });
    await expect(
      queue.processReplayableQueue(async () => {
        throw new Error("should not auto retry");
      }),
    ).resolves.toBe("incomplete");
    expect(await queue.retryAttention(queued!.id)).toBe(true);
    expect(a.rows.get(queued!.id)).toMatchObject({
      state: "pending",
      retries: 0,
      payload: { clientMessageId: "retry-limit-key", retries: 0 },
    });
  });

  it("fences simultaneous processors for the same owner cache", async () => {
    const a = fixture("parallel-processors");
    const queue = new MessageQueue();
    setActiveCache(a.cache);
    await queue.enqueueReplayable({
      ...message,
      clientMessageId: "one-processor-key",
    });
    let releaseSend!: () => void;
    let startedSend!: () => void;
    const sendStarted = new Promise<void>((resolve) => {
      startedSend = resolve;
    });
    const sendGate = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    const send = vi.fn(async () => {
      startedSend();
      await sendGate;
    });

    const first = queue.processReplayableQueue(send);
    await sendStarted;
    await expect(queue.processReplayableQueue(send)).resolves.toBe(
      "incomplete",
    );
    expect(send).toHaveBeenCalledTimes(1);
    releaseSend();
    await expect(first).resolves.toBe("complete");
    expect(a.rows.size).toBe(0);
  });

  it("stores new replayable sends under a discriminator old queue readers ignore", async () => {
    const a = fixture("A");
    const queue = new MessageQueue();
    setActiveCache(a.cache);

    await queue.enqueueReplayable({
      ...message,
      clientMessageId: "stable-request-key",
      thinkingEffort: "high",
      models: ["model-a", "model-b"],
    });

    const [stored] = [...a.rows.values()];
    expect(stored.type).toBe("sendMessageV2");
    expect(stored.payload).toMatchObject({
      clientMessageId: "stable-request-key",
      thinkingEffort: "high",
      models: ["model-a", "model-b"],
    });
    expect(
      [...a.rows.values()].filter((row) => row.type === "sendMessage"),
    ).toHaveLength(0);
  });

  it("cancels without throwing while identity is unresolved", async () => {
    setActiveCache(null);
    const send = vi.fn();
    await expect(new MessageQueue().processQueue(send)).resolves.toBe(
      "cancelled",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    "logout",
    "switch",
  ])("cancels after a late send on %s, preserving both owners' pending writes", async (transition) => {
    const a = fixture("A");
    const b = fixture("B");
    const queue = new MessageQueue();
    setActiveCache(a.cache);
    await queue.enqueue(message);
    await queue.enqueue(message);
    // Same local ID in B must not be deleted by A's late completion.
    const first = [...a.rows.values()][0];
    b.rows.set(first._id, first);
    const send = vi.fn(async (_msg: QueuedMessage) => {
      setActiveCache(transition === "logout" ? null : b.cache);
    });
    await expect(queue.processQueue(send)).resolves.toBe("cancelled");
    expect(send).toHaveBeenCalledTimes(1);
    expect(a.rows.size).toBe(2);
    expect(b.rows.size).toBe(1);
  });

  it("cancels a late rejected send without retrying or mutating another owner", async () => {
    const a = fixture("A");
    const queue = new MessageQueue();
    setActiveCache(a.cache);
    await queue.enqueue(message);
    const send = vi.fn(async () => {
      setActiveCache(null);
      throw new Error("network request failed after logout");
    });
    await expect(queue.processQueue(send)).resolves.toBe("cancelled");
    expect([...a.rows.values()][0].retries).toBe(0);
  });

  it("never enqueues an old mutation's late offline callback into the new owner's queue", async () => {
    const a = fixture("A");
    const b = fixture("B");
    setActiveCache(b.cache);
    await expect(new MessageQueue().enqueue(message, a.cache)).resolves.toBe(
      false,
    );
    expect(a.rows.size).toBe(0);
    expect(b.rows.size).toBe(0);
  });

  it("reports completion only after sending and removing all owned rows", async () => {
    const a = fixture("A");
    const queue = new MessageQueue();
    setActiveCache(a.cache);
    await queue.enqueue(message);
    const send = vi.fn(async () => {});
    await expect(queue.processQueue(send)).resolves.toBe("complete");
    expect(send).toHaveBeenCalledTimes(1);
    expect(a.rows.size).toBe(0);
  });
});
