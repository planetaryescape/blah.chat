/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const start = vi.fn();
const values = vi.fn();
const insert = vi.fn(() => ({ values }));

vi.mock("server-only", () => ({}));

vi.mock("@blah-chat/persistence-postgres", () => ({
  attachments: { id: "attachments" },
  conversations: {},
  createConversationRepository: vi.fn(),
  createSignedReadUrl: vi.fn(),
  messageEdges: {},
  messages: {},
}));

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: () => ({
    start,
  }),
}));

vi.mock("@/lib/persistence/current-user", () => ({
  ensureCurrentPersistenceUser: vi.fn(async () => ({
    id: "pg_user_1",
    clerkId: "user_123",
    email: "user@example.com",
    name: "User",
    imageUrl: null,
  })),
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => ({
    insert,
  }),
}));

vi.mock("@/lib/persistence/storage", () => ({
  getPersistenceEnv: () => ({
    r2: {
      bucket: "blah-chat-dev",
    },
  }),
  getPersistenceR2Client: vi.fn(),
}));

describe("messagesDAL attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    start.mockResolvedValue({
      requestId: "req_1",
      userMessageId: "msg_user_1",
      assistantMessageIds: ["msg_assistant_1"],
    });
    values.mockResolvedValue(undefined);
  });

  it("rejects attachments outside the user's conversation prefix", async () => {
    const { messagesDAL } = await import("../messages");

    await expect(
      messagesDAL.send(
        "user_123",
        "conv_1",
        {
          content: "see attachment",
          attachments: [
            {
              type: "file",
              name: "report.pdf",
              storageId: "users/other/conversations/conv_1/uuid-report.pdf",
              mimeType: "application/pdf",
              size: 1024,
            },
          ],
        },
        "session",
      ),
    ).rejects.toThrow("Invalid attachment");

    expect(start).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("persists owned attachments against the new user message", async () => {
    const { messagesDAL } = await import("../messages");

    const result = await messagesDAL.send(
      "user_123",
      "conv_1",
      {
        content: "see attachment",
        attachments: [
          {
            type: "image",
            name: "photo.png",
            storageId:
              "users/pg_user_1/conversations/conv_1/uuid-1234-photo.png",
            mimeType: "image/png",
            size: 2048,
          },
        ],
      },
      "session",
    );

    expect(start).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith([
      expect.objectContaining({
        messageId: "msg_user_1",
        conversationId: "conv_1",
        userId: "pg_user_1",
        bucket: "blah-chat-dev",
        key: "users/pg_user_1/conversations/conv_1/uuid-1234-photo.png",
      }),
    ]);
    expect(result.data.messageId).toBe("msg_user_1");
  });
});
