import { describe, expect, it, vi } from "vitest";
import {
  createMemoryKeyValueStorage,
  createMobileMessageQueue,
} from "./messageQueue";

function makeQueue() {
  return createMobileMessageQueue(createMemoryKeyValueStorage());
}

describe("mobile message queue", () => {
  describe("enqueueSend", () => {
    it("persists a queued send for an existing conversation", () => {
      const queue = makeQueue();

      const record = queue.enqueueSend({
        conversationId: "conv_1",
        content: "Ship it",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_1",
        createdAt: 1_000,
      });

      expect(record.conversationId).toBe("conv_1");
      expect(record.payload.content).toBe("Ship it");
      expect(record.payload.modelId).toBe("openai:gpt-5-mini");
      expect(record.status).toBe("queued");
      expect(record.retryCount).toBe(0);
      expect(queue.list()).toEqual([record]);
    });

    it("preserves ordering across multiple enqueues", () => {
      const queue = makeQueue();

      queue.enqueueSend({
        conversationId: "conv_1",
        content: "First",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_1",
        createdAt: 1_000,
      });
      queue.enqueueSend({
        conversationId: "conv_1",
        content: "Second",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_2",
        createdAt: 2_000,
      });

      const listed = queue.list();
      expect(listed).toHaveLength(2);
      expect(listed[0]!.payload.content).toBe("First");
      expect(listed[1]!.payload.content).toBe("Second");
    });
  });

  describe("replay — existing conversation", () => {
    it("sends queued message and clears queue on success", async () => {
      const queue = makeQueue();
      queue.enqueueSend({
        conversationId: "conv_1",
        content: "Resume me",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_1",
        createdAt: 1_000,
      });

      const sendMessage = vi.fn().mockResolvedValue({
        requestId: "req_1",
        conversationId: "conv_1",
      });

      const result = await queue.replay({
        createConversation: vi.fn(),
        sendMessage,
        now: () => 2_000,
      });

      expect(sendMessage).toHaveBeenCalledWith(
        "conv_1",
        expect.objectContaining({
          content: "Resume me",
          modelId: "openai:gpt-5-mini",
          clientMessageId: "client_1",
        }),
      );
      expect(result.sent).toHaveLength(1);
      expect(result.sent[0]!.conversationId).toBe("conv_1");
      expect(queue.list()).toEqual([]);
    });
  });

  describe("replay — new local conversation", () => {
    it("creates conversation, reconciles ID, then sends", async () => {
      const queue = makeQueue();
      queue.enqueueSend({
        localConversationId: "local_conv_1",
        createConversation: { model: "openai:gpt-5-mini" },
        content: "Start offline",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_1",
        createdAt: 1_000,
      });

      const createConversation = vi.fn().mockResolvedValue({
        _id: "conv_server_1",
      });
      const sendMessage = vi.fn().mockResolvedValue({
        requestId: "req_1",
        conversationId: "conv_server_1",
      });
      const reconciled = vi.fn();

      const result = await queue.replay({
        createConversation,
        sendMessage,
        onConversationReconciled: reconciled,
        now: () => 2_000,
      });

      expect(createConversation).toHaveBeenCalledWith({
        model: "openai:gpt-5-mini",
      });
      expect(sendMessage).toHaveBeenCalledWith(
        "conv_server_1",
        expect.objectContaining({ content: "Start offline" }),
      );
      expect(reconciled).toHaveBeenCalledWith({
        localConversationId: "local_conv_1",
        conversationId: "conv_server_1",
        clientMessageId: "client_1",
      });
      expect(result.sent).toHaveLength(1);
      expect(queue.list()).toEqual([]);
    });
  });

  describe("replay — failure handling", () => {
    it("increments retryCount and computes exponential backoff", async () => {
      const queue = makeQueue();
      const record = queue.enqueueSend({
        conversationId: "conv_1",
        content: "Retry me",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_1",
        createdAt: 1_000,
      });

      await queue.replay({
        createConversation: vi.fn(),
        sendMessage: vi.fn().mockRejectedValue(new Error("offline")),
        now: () => 2_000,
      });

      const [failed] = queue.list();
      expect(failed!.id).toBe(record.id);
      expect(failed!.retryCount).toBe(1);
      expect(failed!.status).toBe("queued");
      // Backoff: 2000 + 1000 * 2^0 = 3000
      expect(failed!.nextRetryAt).toBe(3_000);
    });

    it("skips records whose nextRetryAt is in the future", async () => {
      const queue = makeQueue();
      queue.enqueueSend({
        conversationId: "conv_1",
        content: "Too early",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_1",
        createdAt: 1_000,
      });

      // Fail once to set nextRetryAt > 2000
      await queue.replay({
        createConversation: vi.fn(),
        sendMessage: vi.fn().mockRejectedValue(new Error("fail")),
        now: () => 2_000,
      });

      const sendMessage = vi.fn().mockResolvedValue({});
      // Replay at time 2500 — still before nextRetryAt (3000)
      await queue.replay({
        createConversation: vi.fn(),
        sendMessage,
        now: () => 2_500,
      });

      expect(sendMessage).not.toHaveBeenCalled();
      expect(queue.list()).toHaveLength(1);
    });
  });

  describe("replay — after backoff expires", () => {
    it("retries successfully when now > nextRetryAt", async () => {
      const queue = makeQueue();
      queue.enqueueSend({
        conversationId: "conv_1",
        content: "Retry me",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "client_1",
        createdAt: 1_000,
      });

      // Fail once to set nextRetryAt = 3000
      await queue.replay({
        createConversation: vi.fn(),
        sendMessage: vi.fn().mockRejectedValue(new Error("fail")),
        now: () => 2_000,
      });
      expect(queue.list()).toHaveLength(1);

      // Replay at time 3001 — after backoff expires
      const sendMessage = vi.fn().mockResolvedValue({
        requestId: "req_1",
        conversationId: "conv_1",
      });
      await queue.replay({
        createConversation: vi.fn(),
        sendMessage,
        now: () => 3_001,
      });

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(queue.list()).toEqual([]);
    });
  });

  describe("clear", () => {
    it("removes all queued records", () => {
      const queue = makeQueue();
      queue.enqueueSend({
        conversationId: "conv_1",
        content: "A",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "c1",
        createdAt: 1_000,
      });
      queue.enqueueSend({
        conversationId: "conv_1",
        content: "B",
        modelId: "openai:gpt-5-mini",
        clientMessageId: "c2",
        createdAt: 2_000,
      });

      queue.clear();
      expect(queue.list()).toEqual([]);
    });
  });
});
