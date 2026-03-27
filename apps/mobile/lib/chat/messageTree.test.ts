import type { GenerationStreamEvent } from "@blah-chat/api-client";
import { describe, expect, it } from "vitest";
import {
  addPendingMessagePair,
  applyGenerationEventToMessages,
  deriveMessageSiblings,
  replaceConversationIdInMessages,
} from "./messageTree";

describe("addPendingMessagePair", () => {
  it("creates a user + pending assistant pair", () => {
    const messages = addPendingMessagePair([], {
      conversationId: "conv_1",
      content: "Hello",
      modelId: "openai:gpt-5-mini",
      clientMessageId: "client_1",
      createdAt: 1_000,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: "user",
      content: "Hello",
      clientMessageId: "client_1",
      status: "complete",
    });
    expect(messages[1]).toMatchObject({
      role: "assistant",
      status: "pending",
      model: "openai:gpt-5-mini",
      content: "",
    });
  });

  it("sorts new pair into existing messages by createdAt", () => {
    const existing = addPendingMessagePair([], {
      conversationId: "conv_1",
      content: "First",
      modelId: "openai:gpt-5-mini",
      clientMessageId: "client_0",
      createdAt: 500,
    });

    const result = addPendingMessagePair(existing, {
      conversationId: "conv_1",
      content: "Second",
      modelId: "openai:gpt-5-mini",
      clientMessageId: "client_1",
      createdAt: 2_000,
    });

    expect(result).toHaveLength(4);
    expect(result[0]!.content).toBe("First");
    expect(result[2]!.content).toBe("Second");
  });

  it("falls back to first model in models array when modelId is absent", () => {
    const messages = addPendingMessagePair([], {
      conversationId: "conv_1",
      content: "Hello",
      models: ["anthropic:claude-3-opus", "openai:gpt-5"],
      clientMessageId: "client_1",
      createdAt: 1_000,
    });

    expect(messages[1]!.model).toBe("anthropic:claude-3-opus");
  });
});

describe("applyGenerationEventToMessages", () => {
  function makePendingPair() {
    return addPendingMessagePair([], {
      conversationId: "conv_1",
      content: "Hello",
      modelId: "openai:gpt-5-mini",
      clientMessageId: "client_1",
      createdAt: 1_000,
    });
  }

  function makeEvent(
    initial: ReturnType<typeof makePendingPair>,
    overrides: Partial<GenerationStreamEvent>,
  ): GenerationStreamEvent {
    return {
      type: "delta",
      requestId: "req_1",
      sessionId: "session_1",
      assistantMessageId: initial[1]!._id,
      modelId: "openai:gpt-5-mini",
      seq: 1,
      ts: 1_100,
      ...overrides,
    } as GenerationStreamEvent;
  }

  it("applies delta event — sets content and status to generating", () => {
    const initial = makePendingPair();
    const updated = applyGenerationEventToMessages(
      initial,
      "conv_1",
      makeEvent(initial, { type: "delta", delta: "Hi there" }),
    );

    expect(updated[1]).toMatchObject({
      status: "generating",
      content: "Hi there",
      partialContent: "Hi there",
    });
  });

  it("accumulates content across multiple deltas", () => {
    const initial = makePendingPair();
    const after1 = applyGenerationEventToMessages(
      initial,
      "conv_1",
      makeEvent(initial, { type: "delta", delta: "Hello " }),
    );
    const after2 = applyGenerationEventToMessages(
      after1,
      "conv_1",
      makeEvent(after1, { type: "delta", delta: "world", seq: 2, ts: 1_200 }),
    );

    expect(after2[1]!.content).toBe("Hello world");
  });

  it("applies complete event — clears partialContent and sets status complete", () => {
    const initial = makePendingPair();
    const withDelta = applyGenerationEventToMessages(
      initial,
      "conv_1",
      makeEvent(initial, { type: "delta", delta: "Final answer" }),
    );
    const completed = applyGenerationEventToMessages(
      withDelta,
      "conv_1",
      makeEvent(withDelta, {
        type: "complete",
        content: "Final answer",
        seq: 2,
        ts: 1_200,
      }),
    );

    expect(completed[1]).toMatchObject({
      status: "complete",
      content: "Final answer",
    });
    expect(completed[1]!.partialContent).toBeUndefined();
  });

  it("applies error event — sets status to error", () => {
    const initial = makePendingPair();
    const errored = applyGenerationEventToMessages(
      initial,
      "conv_1",
      makeEvent(initial, { type: "error" }),
    );

    expect(errored[1]!.status).toBe("error");
    expect(errored[1]!.partialContent).toBeUndefined();
  });

  it("applies cancelled event — sets status to stopped", () => {
    const initial = makePendingPair();
    const cancelled = applyGenerationEventToMessages(
      initial,
      "conv_1",
      makeEvent(initial, { type: "cancelled" }),
    );

    expect(cancelled[1]!.status).toBe("stopped");
  });

  it("creates a new assistant message when ID is not found in existing messages", () => {
    const updated = applyGenerationEventToMessages([], "conv_1", {
      type: "delta",
      requestId: "req_1",
      sessionId: "session_1",
      assistantMessageId: "unknown_msg",
      modelId: "openai:gpt-5-mini",
      seq: 1,
      ts: 1_100,
      delta: "New content",
    } as GenerationStreamEvent);

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      role: "assistant",
      content: "New content",
      status: "generating",
    });
  });
});

describe("replaceConversationIdInMessages", () => {
  it("replaces matching conversation IDs across all messages", () => {
    const initial = addPendingMessagePair([], {
      conversationId: "local_conv_1",
      content: "Hello",
      modelId: "openai:gpt-5-mini",
      clientMessageId: "client_1",
      createdAt: 1_000,
    });

    const updated = replaceConversationIdInMessages(
      initial,
      "local_conv_1",
      "conv_server_1",
    );

    expect(updated.every((m) => m.conversationId === "conv_server_1")).toBe(
      true,
    );
  });

  it("does not mutate the original array", () => {
    const initial = addPendingMessagePair([], {
      conversationId: "local_conv_1",
      content: "Hello",
      modelId: "openai:gpt-5-mini",
      clientMessageId: "client_1",
      createdAt: 1_000,
    });
    const originalLength = initial.length;

    replaceConversationIdInMessages(initial, "local_conv_1", "conv_server_1");

    expect(initial).toHaveLength(originalLength);
    expect(initial[0]!.conversationId).toBe("local_conv_1");
  });

  it("does not modify messages with different conversation IDs", () => {
    const initial = addPendingMessagePair([], {
      conversationId: "conv_other",
      content: "Hello",
      modelId: "openai:gpt-5-mini",
      clientMessageId: "client_1",
      createdAt: 1_000,
    });

    const updated = replaceConversationIdInMessages(
      initial,
      "local_conv_1",
      "conv_server_1",
    );

    expect(updated.every((m) => m.conversationId === "conv_other")).toBe(true);
  });
});

describe("deriveMessageSiblings", () => {
  it("returns sibling messages sharing the same parent", () => {
    const siblings = deriveMessageSiblings(
      [
        {
          _id: "user_1",
          conversationId: "conv_1",
          role: "user",
          content: "Question",
          status: "complete",
          createdAt: 1_000,
          updatedAt: 1_000,
          parentMessageIds: [],
          siblingIndex: 0,
        },
        {
          _id: "assistant_1",
          conversationId: "conv_1",
          role: "assistant",
          content: "First answer",
          status: "complete",
          createdAt: 2_000,
          updatedAt: 2_000,
          parentMessageIds: ["user_1"],
          siblingIndex: 0,
        },
        {
          _id: "assistant_2",
          conversationId: "conv_1",
          role: "assistant",
          content: "Second answer",
          status: "complete",
          createdAt: 2_100,
          updatedAt: 2_100,
          parentMessageIds: ["user_1"],
          siblingIndex: 1,
        },
      ],
      "assistant_2",
    );

    expect(siblings.map((m) => m._id)).toEqual(["assistant_1", "assistant_2"]);
  });

  it("returns empty array when message has no parent", () => {
    const siblings = deriveMessageSiblings(
      [
        {
          _id: "user_1",
          conversationId: "conv_1",
          role: "user",
          content: "Root",
          status: "complete",
          createdAt: 1_000,
          updatedAt: 1_000,
          parentMessageIds: [],
          siblingIndex: 0,
        },
      ],
      "user_1",
    );

    expect(siblings).toEqual([]);
  });

  it("returns empty array when message ID is not found", () => {
    expect(deriveMessageSiblings([], "nonexistent")).toEqual([]);
  });
});
