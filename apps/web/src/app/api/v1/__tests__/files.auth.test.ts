/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const processMock = vi.fn();
const triggerTaskMock = vi.fn();
let startMock = vi.fn();
let getTokenMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;
let requestCounter = 0;

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");

  return {
    ...actual,
    createSignedUploadUrl: vi.fn(
      async ({ key }) => `https://r2.example/upload/${key}`,
    ),
    createSignedReadUrl: vi.fn(
      async ({ key }) => `https://r2.example/read/${key}`,
    ),
    createTriggerClient: vi.fn(() => ({
      triggerTask: triggerTaskMock,
    })),
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/persistence/storage", () => ({
  getPersistenceEnv: () => ({
    r2: {
      bucket: "blah-chat-test",
    },
  }),
  getPersistenceR2Client: vi.fn(() => ({})),
}));

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: () => ({
    start: startMock,
    process: processMock,
  }),
  getEnqueueGenerationProcessing: () => async (requestId: string) => {
    await processMock(requestId);
  },
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    after: (callback: () => Promise<void> | void) => {
      void callback();
    },
  };
});

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/api/monitoring", () => ({
  trackAPIPerformance: vi.fn(),
}));

vi.mock("server-only", () => ({}));

describe("file upload auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    requestCounter = 0;
    getTokenMock = vi.fn(async () => {
      throw new Error("Convex token should not be requested");
    });
    processMock.mockResolvedValue(undefined);
    triggerTaskMock.mockResolvedValue({ id: "run_123" });

    authMock.mockResolvedValue({
      userId: "clerk_phase6",
      getToken: getTokenMock,
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_phase6",
      primaryEmailAddress: { emailAddress: "phase6@example.com" },
      fullName: "Phase Six",
      firstName: "Phase",
      lastName: "Six",
      imageUrl: "https://example.com/phase6.png",
    });

    startMock = vi.fn(
      async (input: {
        clerkUser: { clerkId: string };
        conversationId: string;
        content: string;
        modelId?: string;
        models?: string[];
      }) => {
        requestCounter += 1;
        const users = createUserRepository(db);
        const conversations = createConversationRepository(db);
        const messages = createMessageRepository(db);
        const user = await users.findByClerkId(input.clerkUser.clerkId);

        if (!user) {
          throw new Error("Missing persistence user");
        }

        const userMessage = await messages.create({
          conversationId: input.conversationId,
          userId: user.id,
          role: "user",
          content: input.content,
          parentMessageIds: [],
          siblingIndex: 0,
        });
        const assistantMessage = await messages.create({
          conversationId: input.conversationId,
          role: "assistant",
          content: "",
          model: input.modelId ?? input.models?.[0] ?? "gpt-5",
          parentMessageIds: [userMessage.id],
          siblingIndex: 0,
        });

        await conversations.setActiveLeaf({
          conversationId: input.conversationId,
          activeLeafMessageId: assistantMessage.id,
        });

        return {
          requestId: `req_phase6_${requestCounter}`,
          userMessageId: userMessage.id,
          assistantMessageIds: [assistantMessage.id],
          modelIds: [assistantMessage.model ?? "gpt-5"],
        };
      },
    );
  });

  it("creates an upload url, persists attachment metadata, and reads it back through the chat API", async () => {
    const { POST: createConversation } = await import("../conversations/route");
    const { POST: createUploadUrl } = await import("../files/upload-url/route");
    const { POST: sendMessage, GET: listMessages } = await import(
      "../conversations/[id]/messages/route"
    );

    const createConversationResponse = await createConversation(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Attachment Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createConversationResponse.status).toBe(201);
    const createConversationJson = await createConversationResponse.json();
    const createdConversation = unwrapData<{ _id: string }>(
      createConversationJson,
    );

    const uploadResponse = await createUploadUrl(
      createMockRequest("/api/v1/files/upload-url", {
        method: "POST",
        body: {
          conversationId: createdConversation._id,
          fileName: "photo.png",
          contentType: "image/png",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(uploadResponse.status).toBe(200);
    const uploadJson = await uploadResponse.json();
    const upload = unwrapData<{
      uploadUrl: string;
      storageId: string;
      method: string;
    }>(uploadJson);

    expect(upload.uploadUrl).toContain(upload.storageId);
    expect(upload.storageId).toContain(
      `/conversations/${createdConversation._id}/`,
    );
    expect(upload.method).toBe("PUT");

    const sendResponse = await sendMessage(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
        {
          method: "POST",
          body: {
            content: "See attachment",
            attachments: [
              {
                type: "image",
                name: "photo.png",
                storageId: upload.storageId,
                mimeType: "image/png",
                size: 2048,
              },
            ],
          },
        },
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(sendResponse.status).toBe(202);
    const sendJson = await sendResponse.json();
    const sent = unwrapData<{
      requestId: string;
      messageId: string;
    }>(sendJson);
    expect(processMock).toHaveBeenCalledWith(sent.requestId);
    const legacyAttachmentQuery = vi
      .spyOn(db.query.attachments, "findMany")
      .mockImplementation((() => {
        throw new Error("legacy attachment query should not be called");
      }) as any);

    const listResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(listResponse.status).toBe(200);
    const listJson = (await listResponse.json()) as Array<{
      data: {
        _id: string;
        attachments?: Array<{
          storageId: string;
          url?: string;
          mimeType: string;
          size: number;
          name: string;
        }>;
      };
    }>;

    const messageWithAttachment = listJson.find(
      (message) => message.data._id === sent.messageId,
    );

    expect(messageWithAttachment?.data.attachments).toEqual([
      expect.objectContaining({
        type: "image",
        storageId: upload.storageId,
        url: `https://r2.example/read/${upload.storageId}`,
        mimeType: "image/png",
        size: 2048,
        name: "photo.png",
      }),
    ]);
    expect(legacyAttachmentQuery).not.toHaveBeenCalled();
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });

  it("enqueues background text extraction for extractable message attachments", async () => {
    const { POST: createConversation } = await import("../conversations/route");
    const { POST: createUploadUrl } = await import("../files/upload-url/route");
    const { POST: sendMessage } = await import(
      "../conversations/[id]/messages/route"
    );

    const createConversationResponse = await createConversation(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Extractable Attachment Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );
    const createConversationJson = await createConversationResponse.json();
    const createdConversation = unwrapData<{ _id: string }>(
      createConversationJson,
    );

    const uploadResponse = await createUploadUrl(
      createMockRequest("/api/v1/files/upload-url", {
        method: "POST",
        body: {
          conversationId: createdConversation._id,
          fileName: "report.pdf",
          contentType: "application/pdf",
        },
      }),
      { params: Promise.resolve({}) },
    );
    const uploadJson = await uploadResponse.json();
    const upload = unwrapData<{ storageId: string }>(uploadJson);

    const sendResponse = await sendMessage(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
        {
          method: "POST",
          body: {
            content: "Please index this attachment",
            attachments: [
              {
                type: "file",
                name: "report.pdf",
                storageId: upload.storageId,
                mimeType: "application/pdf",
                size: 4096,
              },
            ],
          },
        },
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(sendResponse.status).toBe(202);
    expect(triggerTaskMock).toHaveBeenCalledWith("extract-text", {
      attachmentId: expect.any(String),
      storageId: upload.storageId,
      fileName: "report.pdf",
      mimeType: "application/pdf",
    });
  });
});
