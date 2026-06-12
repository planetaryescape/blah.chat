import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OptimisticMessage } from "@/types/optimistic";
import { useOptimisticMessages } from "../useOptimisticMessages";

function createServerMessage(overrides: Partial<any> = {}): any {
  const now = Date.now();
  return {
    _id: `msg-${crypto.randomUUID()}` as string,
    _creationTime: now,
    conversationId: "conv-1" as string,
    userId: "user-1" as string,
    role: "user",
    content: "Test message",
    status: "complete",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("useOptimisticMessages", () => {
  it("orders user before assistant when createdAt timestamps tie", () => {
    const timestamp = 1_700_000_000_000;
    const userMessage = createServerMessage({
      _id: "msg-user" as string,
      role: "user",
      createdAt: timestamp,
      content: "Hello",
    });
    const assistantMessage = createServerMessage({
      _id: "msg-assistant" as string,
      role: "assistant",
      status: "pending",
      createdAt: timestamp,
      content: "",
      parentMessageIds: [userMessage._id],
      model: "openai:gpt-5",
    });

    // Simulate cache/index order ambiguity when timestamps are identical.
    const serverMessages = [assistantMessage, userMessage];

    const { result } = renderHook(() =>
      useOptimisticMessages({ serverMessages, conversationId: "conv-1" }),
    );

    expect(result.current.messages?.map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
  });

  it("deduplicates optimistic user message with small clock skew and keeps order", () => {
    const timestamp = 1_700_000_100_000;
    const optimisticUserMessage: OptimisticMessage = {
      _id: "temp-user-1",
      conversationId: "conv-1" as string,
      userId: "user-1" as string,
      role: "user",
      content: "Skew test",
      status: "optimistic",
      createdAt: timestamp,
      updatedAt: timestamp,
      _creationTime: timestamp,
      _optimistic: true,
    };

    const { result, rerender } = renderHook(
      ({ serverMessages }) =>
        useOptimisticMessages({ serverMessages, conversationId: "conv-1" }),
      { initialProps: { serverMessages: [] as any[] } },
    );

    act(() => {
      result.current.addOptimisticMessages([optimisticUserMessage]);
    });

    const serverUserMessage = createServerMessage({
      _id: "msg-server-user" as string,
      role: "user",
      content: "Skew test",
      // Server slightly behind optimistic timestamp (clock skew)
      createdAt: timestamp - 500,
    });
    const serverAssistantMessage = createServerMessage({
      _id: "msg-server-assistant" as string,
      role: "assistant",
      status: "pending",
      content: "",
      createdAt: timestamp - 500,
      parentMessageIds: [serverUserMessage._id],
      model: "openai:gpt-5",
    });

    // Intentionally wrong incoming order from cache/query layer
    rerender({
      serverMessages: [serverAssistantMessage, serverUserMessage],
    });

    expect(result.current.messages?.map((m) => m._id)).toEqual([
      "msg-server-user",
      "msg-server-assistant",
    ]);
    expect(
      result.current.messages?.some((m) => String(m._id).startsWith("temp-")),
    ).toBe(false);
  });

  it("deduplicates optimistic user message by clientMessageId", () => {
    const timestamp = 1_700_000_200_000;
    const optimisticUserMessage: OptimisticMessage = {
      _id: "temp-user-client-id",
      conversationId: "conv-1" as string,
      userId: "user-1" as string,
      role: "user",
      content: "Client id test",
      clientMessageId: "client-123",
      status: "optimistic",
      createdAt: timestamp,
      updatedAt: timestamp,
      _creationTime: timestamp,
      _optimistic: true,
    };

    const { result, rerender } = renderHook(
      ({ serverMessages }) =>
        useOptimisticMessages({ serverMessages, conversationId: "conv-1" }),
      { initialProps: { serverMessages: [] as any[] } },
    );

    act(() => {
      result.current.addOptimisticMessages([optimisticUserMessage]);
    });

    const serverUserMessage = createServerMessage({
      _id: "msg-server-client-id" as string,
      role: "user",
      content: "Client id test",
      clientMessageId: "client-123",
      createdAt: timestamp + 60_000,
    });
    const serverAssistantMessage = createServerMessage({
      _id: "msg-server-assistant-client-id" as string,
      role: "assistant",
      status: "pending",
      content: "",
      parentMessageIds: [serverUserMessage._id],
      model: "openai:gpt-5",
      createdAt: timestamp + 60_000,
    });

    rerender({
      serverMessages: [serverAssistantMessage, serverUserMessage],
    });

    expect(result.current.messages?.map((m) => m._id)).toEqual([
      "msg-server-client-id",
      "msg-server-assistant-client-id",
    ]);
    expect(
      result.current.messages?.some((m) => String(m._id).startsWith("temp-")),
    ).toBe(false);
  });

  it("does not leak optimistic messages into another conversation", () => {
    const timestamp = 1_700_000_300_000;
    const optimisticUserMessage: OptimisticMessage = {
      _id: "temp-user-leak",
      conversationId: "conv-1" as string,
      userId: "user-1" as string,
      role: "user",
      content: "Leak test",
      status: "optimistic",
      createdAt: timestamp,
      updatedAt: timestamp,
      _creationTime: timestamp,
      _optimistic: true,
    };

    const { result, rerender } = renderHook(
      ({ serverMessages, conversationId }) =>
        useOptimisticMessages({ serverMessages, conversationId }),
      {
        initialProps: {
          // New/empty conversation: no server messages to derive an id from.
          serverMessages: [] as any[],
          conversationId: "conv-1" as string | undefined,
        },
      },
    );

    act(() => {
      result.current.addOptimisticMessages([optimisticUserMessage]);
    });
    expect(result.current.messages?.map((m) => m._id)).toEqual([
      "temp-user-leak",
    ]);

    // Switch to another (also empty) conversation.
    rerender({ serverMessages: [] as any[], conversationId: "conv-2" });

    expect(result.current.messages).toEqual([]);
  });

  it("filters optimistic messages stamped for a different conversation", () => {
    const timestamp = 1_700_000_400_000;
    const foreignOptimistic: OptimisticMessage = {
      _id: "temp-user-foreign",
      conversationId: "conv-other" as string,
      userId: "user-1" as string,
      role: "user",
      content: "Wrong conversation",
      status: "optimistic",
      createdAt: timestamp,
      updatedAt: timestamp,
      _creationTime: timestamp,
      _optimistic: true,
    };

    const { result } = renderHook(() =>
      useOptimisticMessages({
        serverMessages: [] as any[],
        conversationId: "conv-1",
      }),
    );

    act(() => {
      result.current.addOptimisticMessages([foreignOptimistic]);
    });

    expect(result.current.messages).toEqual([]);
  });
});
