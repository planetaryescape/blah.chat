/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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
        sessionToken: "test-session-token",
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

// 2. Imports AFTER mocks
import { messagesDAL } from "@/lib/api/dal/messages";
import {
  assertEnvelopeError,
  assertEnvelopeSuccess,
  createMockRequest,
} from "@/lib/test/api-helpers";

describe("/api/v1/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/conversations/:id/messages", () => {
    it("returns messages with envelope structure", async () => {
      const mockMessages = [
        {
          status: "success" as const,
          sys: { entity: "message", id: "msg1" },
          data: {
            _id: "msg1",
            content: "Hello",
            role: "user",
            status: "complete",
            _creationTime: Date.now(),
          },
        },
        {
          status: "success" as const,
          sys: { entity: "message", id: "msg2" },
          data: {
            _id: "msg2",
            content: "Hi there!",
            role: "assistant",
            status: "complete",
            model: "gpt-4o",
            _creationTime: Date.now(),
          },
        },
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
      const mockResult = {
        status: "success" as const,
        sys: { entity: "message", async: true },
        data: {
          conversationId: "conv-123",
          messageId: "msg-user" as any,
          assistantMessageId: "msg-assistant" as any,
          status: "pending",
          pollUrl: "/api/v1/messages/msg-assistant",
        },
      };
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

    it("calls DAL with content and sessionToken", async () => {
      const mockResult = {
        status: "success" as const,
        sys: { entity: "message", async: true },
        data: {
          conversationId: "conv-123",
          messageId: "msg-1" as any,
          assistantMessageId: "msg-2" as any,
          status: "pending",
          pollUrl: "/api/v1/messages/msg-2",
        },
      };
      vi.mocked(messagesDAL.send).mockResolvedValue(mockResult);

      const { POST } = await import("../conversations/[id]/messages/route");
      const req = createMockRequest("/api/v1/conversations/conv-123/messages", {
        method: "POST",
        body: {
          content: "Test message",
          modelId: "gpt-4o",
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
          thinkingEffort: "medium",
        },
        "test-session-token",
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
      const mockResult = {
        status: "success" as const,
        sys: { entity: "message", async: true },
        data: {
          conversationId: "conv-123",
          messageId: "msg-1" as any,
          assistantMessageId: "msg-2" as any,
          status: "pending",
          pollUrl: "/api/v1/messages/msg-2",
        },
      };
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
