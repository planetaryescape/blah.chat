import { describe, expect, it } from "vitest";
import {
  applyGenerationEventToMessages,
  createPendingAssistantMessages,
  extractMessagesFromPayload,
} from "../useRestMessageSync";

describe("useRestMessageSync helpers", () => {
  it("extracts messages from list envelopes", () => {
    const messages = extractMessagesFromPayload([
      {
        data: {
          _id: "msg_1",
          conversationId: "conv_1",
          role: "user",
          content: "hello",
          createdAt: 1,
          updatedAt: 1,
          _creationTime: 1,
        },
      },
      {
        data: {
          _id: "msg_2",
          conversationId: "conv_1",
          role: "assistant",
          content: "hi",
          createdAt: 2,
          updatedAt: 2,
          _creationTime: 2,
        },
      },
    ]);

    expect(messages.map((message) => message._id)).toEqual(["msg_1", "msg_2"]);
  });

  it("extracts messages from SSE payloads", () => {
    const messages = extractMessagesFromPayload({
      messages: [
        {
          data: {
            _id: "msg_3",
            conversationId: "conv_1",
            role: "assistant",
            content: "stream",
            partialContent: "stream",
            status: "generating",
            createdAt: 3,
            updatedAt: 4,
            _creationTime: 3,
          },
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      _id: "msg_3",
      partialContent: "stream",
      status: "generating",
    });
  });

  it("applies delta events to the cached assistant message", () => {
    const messages = applyGenerationEventToMessages(
      [
        {
          _id: "msg_1",
          conversationId: "conv_1",
          role: "assistant",
          content: "hel",
          partialContent: "hel",
          status: "generating",
          model: "openai:gpt-5",
          createdAt: 1,
          updatedAt: 1,
          _creationTime: 1,
        },
      ],
      "conv_1",
      {
        type: "delta",
        requestId: "req_1",
        sessionId: "sess_1",
        assistantMessageId: "msg_1",
        modelId: "openai:gpt-5",
        seq: 1,
        ts: 2,
        delta: "lo",
      },
    );

    expect(messages[0]).toMatchObject({
      _id: "msg_1",
      content: "hello",
      partialContent: "hello",
      status: "generating",
    });
  });

  it("creates a resumable assistant stub from a complete event when cache is cold", () => {
    const messages = applyGenerationEventToMessages([], "conv_1", {
      type: "complete",
      requestId: "req_1",
      sessionId: "sess_1",
      assistantMessageId: "msg_2",
      modelId: "openai:gpt-5",
      seq: 2,
      ts: 3,
      content: "done",
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      _id: "msg_2",
      conversationId: "conv_1",
      role: "assistant",
      content: "done",
      status: "complete",
      model: "openai:gpt-5",
    });
  });

  it("ignores unknown start events instead of creating ghost assistant messages", () => {
    const messages = applyGenerationEventToMessages(
      [
        {
          _id: "msg_user_1",
          conversationId: "conv_1",
          role: "user",
          content: "hello",
          status: "complete",
          createdAt: 1,
          updatedAt: 1,
          _creationTime: 1,
        },
        {
          _id: "msg_assistant_1",
          conversationId: "conv_1",
          role: "assistant",
          content: "hi",
          status: "complete",
          model: "openai:gpt-5",
          createdAt: 2,
          updatedAt: 2,
          _creationTime: 2,
        },
      ],
      "conv_1",
      {
        type: "start",
        requestId: "req_2",
        sessionId: "sess_2",
        assistantMessageId: "msg_ghost",
        modelId: "openai:gpt-5.2-chat",
        seq: 0,
        ts: 3,
      },
    );

    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message._id)).toEqual([
      "msg_user_1",
      "msg_assistant_1",
    ]);
  });

  it("recreates an in-flight assistant message from an unknown delta event", () => {
    const messages = applyGenerationEventToMessages(
      [
        {
          _id: "msg_user_1",
          conversationId: "conv_1",
          role: "user",
          content: "hello",
          status: "complete",
          createdAt: 1,
          updatedAt: 1,
          _creationTime: 1,
        },
      ],
      "conv_1",
      {
        type: "delta",
        requestId: "req_2",
        sessionId: "sess_2",
        assistantMessageId: "msg_live",
        modelId: "openai:gpt-5.2-chat",
        seq: 1,
        ts: 3,
        delta: "Hi there",
      },
    );

    expect(messages).toHaveLength(2);
    expect(messages[1]).toMatchObject({
      _id: "msg_live",
      role: "assistant",
      content: "Hi there",
      partialContent: "Hi there",
      status: "generating",
      model: "openai:gpt-5.2-chat",
    });
  });

  it("creates pending assistant placeholders immediately from send metadata", () => {
    const messages = createPendingAssistantMessages({
      conversationId: "conv_1",
      assistantMessageIds: ["msg_assistant_1"],
      modelIds: ["openai:gpt-5.2-chat"],
      ts: 123,
    });

    expect(messages).toEqual([
      {
        _id: "msg_assistant_1",
        conversationId: "conv_1",
        role: "assistant",
        content: "",
        partialContent: undefined,
        status: "pending",
        model: "openai:gpt-5.2-chat",
        createdAt: 123,
        updatedAt: 123,
        _creationTime: 123,
      },
    ]);
  });
});
