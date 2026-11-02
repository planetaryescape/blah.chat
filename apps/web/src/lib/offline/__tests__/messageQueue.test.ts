import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
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
      where: () => ({
        equals: () => ({ toArray: async () => [...rows.values()] }),
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
