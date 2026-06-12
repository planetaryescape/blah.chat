/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const start = vi.fn();
const triggerTask = vi.fn();
const returning = vi.fn();
const values = vi.fn();
const insert = vi.fn(() => ({ values }));

vi.mock("server-only", () => ({}));

vi.mock("@blah-chat/persistence-postgres", () => ({
  attachments: { id: "attachments" },
  conversations: {},
  createTriggerClient: vi.fn(() => ({
    triggerTask,
  })),
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

vi.mock("@/lib/api/dal/generationPolicy", () => ({
  assertGenerationAllowed: vi.fn(async () => {}),
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
      modelIds: ["openai:gpt-5.2-chat"],
    });
    values.mockReturnValue({
      returning,
    });
    returning.mockResolvedValue([
      {
        id: "att_1",
        messageId: "msg_user_1",
        conversationId: "conv_1",
        userId: "pg_user_1",
        type: "image",
        key: "users/pg_user_1/conversations/conv_1/uuid-1234-photo.png",
        bucket: "blah-chat-dev",
        name: "photo.png",
        mimeType: "image/png",
        size: 2048,
        createdAt: 123,
      },
    ]);
    triggerTask.mockResolvedValue({ id: "run_123" });
  });

  it("rejects attachments outside the user's conversation prefix", async () => {
    const { messagesDAL } = await import("../messages");

    let error: unknown;
    try {
      await messagesDAL.send("user_123", "conv_1", {
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
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Invalid attachment");

    expect(start).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("persists owned attachments against the new user message", async () => {
    const { messagesDAL } = await import("../messages");

    const result = await messagesDAL.send("user_123", "conv_1", {
      content: "see attachment",
      attachments: [
        {
          type: "image",
          name: "photo.png",
          storageId: "users/pg_user_1/conversations/conv_1/uuid-1234-photo.png",
          mimeType: "image/png",
          size: 2048,
        },
      ],
    });

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
    expect(returning).toHaveBeenCalled();
    expect(result.data.messageId).toBe("msg_user_1");
  });

  it("enqueues text extraction for extractable attachments on the Postgres path", async () => {
    const { messagesDAL } = await import("../messages");
    returning.mockResolvedValueOnce([
      {
        id: "att_pdf_1",
        messageId: "msg_user_1",
        conversationId: "conv_1",
        userId: "pg_user_1",
        type: "file",
        key: "users/pg_user_1/conversations/conv_1/uuid-1234-report.pdf",
        bucket: "blah-chat-dev",
        name: "report.pdf",
        mimeType: "application/pdf",
        size: 4096,
        createdAt: 456,
      },
    ]);

    await messagesDAL.send("user_123", "conv_1", {
      content: "index this document",
      attachments: [
        {
          type: "file",
          name: "report.pdf",
          storageId:
            "users/pg_user_1/conversations/conv_1/uuid-1234-report.pdf",
          mimeType: "application/pdf",
          size: 4096,
        },
      ],
    });

    expect(returning).toHaveBeenCalled();
    expect(triggerTask).toHaveBeenCalledWith("extract-text", {
      attachmentId: "att_pdf_1",
      storageId: "users/pg_user_1/conversations/conv_1/uuid-1234-report.pdf",
      fileName: "report.pdf",
      mimeType: "application/pdf",
    });
  });
});
