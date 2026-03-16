import { describe, expect, it } from "vitest";
import { extractMessagesFromPayload } from "../useRestMessageSync";

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
});
