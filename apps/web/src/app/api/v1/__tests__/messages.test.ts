/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const process = vi.fn();
const { enqueueProcessing } = vi.hoisted(() => ({
  enqueueProcessing: vi.fn().mockResolvedValue(undefined),
}));

// 1. Mocks MUST be defined before imports
vi.mock("@/lib/api/dal/messages", () => ({
  messagesDAL: {
    send: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    regenerate: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) => {
      return handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "test-user-id",
      });
    },
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
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

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: () => ({
    process,
  }),
  getEnqueueGenerationProcessing: () => enqueueProcessing,
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

// 2. Imports AFTER mocks
import { messagesDAL } from "@/lib/api/dal/messages";
import {
  assertEnvelopeError,
  assertEnvelopeSuccess,
  createMockRequest,
} from "@/lib/test/api-helpers";

function createMessageEnvelope(
  overrides?: Partial<{
    _id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    clientMessageId: string | undefined;
    partialContent: string | undefined;
    status: "pending" | "generating" | "complete" | "stopped" | "error";
    model: string | null;
    comparisonGroupId: string | undefined;
    consolidatedMessageId: string | undefined;
    isConsolidation: boolean;
    rootMessageId: string | undefined;
    siblingIndex: number;
    forkReason: string | undefined;
    attachments:
      | Array<{
          id: string;
          type: "file" | "image" | "audio";
          storageId: string;
          name: string;
          mimeType: string;
          size: number;
          url?: string;
        }>
      | undefined;
    parentMessageId: string | undefined;
    parentMessageIds: string[] | undefined;
    isActiveBranch: boolean;
    createdAt: number;
    updatedAt: number;
    _creationTime: number;
  }>,
) {
  const timestamp = Date.now();

  return {
    status: "success" as const,
    sys: { entity: "message", id: overrides?._id ?? "msg-1" },
    data: {
      _id: overrides?._id ?? "msg-1",
      conversationId: overrides?.conversationId ?? "conv-123",
      role: overrides?.role ?? "user",
      content: overrides?.content ?? "Hello",
      clientMessageId: overrides?.clientMessageId,
      partialContent: overrides?.partialContent,
      status: overrides?.status ?? "complete",
      model: overrides?.model ?? null,
      comparisonGroupId: overrides?.comparisonGroupId,
      consolidatedMessageId: overrides?.consolidatedMessageId,
      isConsolidation: overrides?.isConsolidation ?? false,
      rootMessageId: overrides?.rootMessageId,
      siblingIndex: overrides?.siblingIndex ?? 0,
      forkReason: overrides?.forkReason,
      attachments: overrides?.attachments,
      parentMessageId: overrides?.parentMessageId,
      parentMessageIds: overrides?.parentMessageIds,
      isActiveBranch: overrides?.isActiveBranch ?? true,
      createdAt: overrides?.createdAt ?? timestamp,
      updatedAt: overrides?.updatedAt ?? timestamp,
      _creationTime: overrides?._creationTime ?? timestamp,
    },
  };
}

function createSendEnvelope(
  overrides?: Partial<{
    requestId: string;
    conversationId: string;
    messageId: string;
    assistantMessageId: string;
    assistantMessageIds: string[];
    assistantModelId: string;
    modelIds: string[];
    status: "pending";
    pollUrl: string;
    streamUrl: string;
    stopUrl: string;
  }>,
) {
  return {
    status: "success" as const,
    sys: { entity: "message", async: true },
    data: {
      requestId: overrides?.requestId ?? "req-1",
      conversationId: overrides?.conversationId ?? "conv-123",
      messageId: overrides?.messageId ?? "msg-user",
      assistantMessageId: overrides?.assistantMessageId ?? "msg-assistant",
      assistantMessageIds: overrides?.assistantMessageIds ?? [
        overrides?.assistantMessageId ?? "msg-assistant",
      ],
      assistantModelId:
        overrides?.assistantModelId ?? overrides?.modelIds?.[0] ?? "gpt-4o",
      modelIds: overrides?.modelIds ?? [
        overrides?.assistantModelId ?? "gpt-4o",
      ],
      status: overrides?.status ?? "pending",
      pollUrl:
        overrides?.pollUrl ??
        `/api/v1/messages/${overrides?.assistantMessageId ?? "msg-assistant"}`,
      streamUrl:
        overrides?.streamUrl ??
        `/api/v1/generations/${overrides?.requestId ?? "req-1"}/stream`,
      stopUrl:
        overrides?.stopUrl ??
        `/api/v1/generations/${overrides?.requestId ?? "req-1"}/stop`,
    },
  };
}

describe("/api/v1/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("GET /api/v1/conversations/:id/messages", () => {
    it("returns messages with envelope structure", async () => {
      const mockMessages = [
        createMessageEnvelope({ _id: "msg1", content: "Hello" }),
        createMessageEnvelope({
          _id: "msg2",
          role: "assistant",
          content: "Hi there!",
          model: "gpt-4o",
        }),
      ];
      vi.mocked(messagesDAL.list).mockResolvedValue(mockMessages);

      const { GET } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages");
      const response = await GET(req, {
        params: Promise.resolve({ id: "conv-123" }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(2);
    });

    it("calls DAL with correct userId and conversationId", async () => {
      vi.mocked(messagesDAL.list).mockResolvedValue([]);

      const { GET } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-456/messages");
      await GET(req, { params: Promise.resolve({ id: "conv-456" }) });

      expect(messagesDAL.list).toHaveBeenCalledWith("test-user-id", "conv-456");
    });

    it("includes cache headers", async () => {
      vi.mocked(messagesDAL.list).mockResolvedValue([]);

      const { GET } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages");
      const response = await GET(req, {
        params: Promise.resolve({ id: "conv-123" }),
      });

      expect(response.headers.get("Cache-Control")).toBeTruthy();
    });
  });

  describe("POST /api/v1/conversations/:id/messages", () => {
    it("sends message and returns 202 Accepted", async () => {
      const mockResult = createSendEnvelope();
      vi.mocked(messagesDAL.send).mockResolvedValue(mockResult);

      const { POST } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages", {
        method: "POST",
        body: { content: "Hello, how are you?" },
      });
      const response = await POST(req, {
        params: Promise.resolve({ id: "conv-123" }),
      });
      const json = await response.json();

      expect(response.status).toBe(202);
      assertEnvelopeSuccess(json);
      expect(json.sys.async).toBe(true);
      expect(json.data.status).toBe("pending");
      expect(json.data.pollUrl).toBeDefined();
    });

    it("calls DAL with content", async () => {
      const mockResult = createSendEnvelope({
        assistantMessageId: "msg-2",
        assistantMessageIds: ["msg-2"],
        messageId: "msg-1",
      });
      vi.mocked(messagesDAL.send).mockResolvedValue(mockResult);

      const { POST } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages", {
        method: "POST",
        body: {
          content: "Test message",
          modelId: "gpt-4o",
          clientMessageId: "client-abc123",
          thinkingEffort: "medium",
        },
      });
      await POST(req, { params: Promise.resolve({ id: "conv-123" }) });

      expect(messagesDAL.send).toHaveBeenCalledWith(
        "test-user-id",
        "conv-123",
        {
          content: "Test message",
          modelId: "gpt-4o",
          clientMessageId: "client-abc123",
          thinkingEffort: "medium",
        },
      );
    });

    it("rejects request missing content", async () => {
      const { POST } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages", {
        method: "POST",
        body: { modelId: "gpt-4o" },
      });
      const response = await POST(req, {
        params: Promise.resolve({ id: "conv-123" }),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      assertEnvelopeError(json);
    });

    it("rejects empty content", async () => {
      const { POST } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages", {
        method: "POST",
        body: { content: "" },
      });
      const response = await POST(req, {
        params: Promise.resolve({ id: "conv-123" }),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      assertEnvelopeError(json);
    });

    it("accepts optional attachments", async () => {
      const mockResult = createSendEnvelope({
        assistantMessageId: "msg-2",
        assistantMessageIds: ["msg-2"],
        messageId: "msg-1",
      });
      vi.mocked(messagesDAL.send).mockResolvedValue(mockResult);

      const { POST } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages", {
        method: "POST",
        body: {
          content: "Here is a file",
          attachments: [
            {
              type: "file",
              name: "doc.pdf",
              storageId: "storage-123",
              mimeType: "application/pdf",
              size: 1024,
            },
          ],
        },
      });
      const response = await POST(req, {
        params: Promise.resolve({ id: "conv-123" }),
      });

      expect(response.status).toBe(202);
    });

    it("rejects invalid thinkingEffort value", async () => {
      const { POST } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages", {
        method: "POST",
        body: { content: "Test", thinkingEffort: "invalid" },
      });
      const response = await POST(req, {
        params: Promise.resolve({ id: "conv-123" }),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      assertEnvelopeError(json);
    });
  });
});
