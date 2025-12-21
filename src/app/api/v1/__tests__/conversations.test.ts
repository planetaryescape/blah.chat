/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// 1. Mocks MUST be defined before imports
vi.mock("@/lib/api/dal/conversations", () => ({
  conversationsDAL: {
    create: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
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
import { conversationsDAL } from "@/lib/api/dal/conversations";
import {
  assertEnvelopeError,
  assertEnvelopeSuccess,
  createMockRequest,
} from "@/lib/test/api-helpers";

describe("/api/v1/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/conversations", () => {
    it("returns list with envelope structure", async () => {
      const mockConversations = [
        {
          status: "success" as const,
          sys: { entity: "conversation", id: "conv1" },
          data: {
            _id: "conv1",
            title: "Chat 1",
            model: "gpt-4o",
            _creationTime: Date.now(),
          },
        },
      ];
      vi.mocked(conversationsDAL.list).mockResolvedValue(mockConversations);

      const { GET } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations");
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      assertEnvelopeSuccess(json);
      expect(json.sys.entity).toBe("list");
      expect(json.data.items).toHaveLength(1);
      expect(json.data.total).toBe(1);
    });

    it("passes limit query parameter to DAL", async () => {
      vi.mocked(conversationsDAL.list).mockResolvedValue([]);

      const { GET } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations?limit=25");
      await GET(req, { params: Promise.resolve({}) });

      expect(conversationsDAL.list).toHaveBeenCalledWith(
        "test-user-id",
        25,
        false,
      );
    });

    it("passes archived query parameter to DAL", async () => {
      vi.mocked(conversationsDAL.list).mockResolvedValue([]);

      const { GET } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations?archived=true");
      await GET(req, { params: Promise.resolve({}) });

      expect(conversationsDAL.list).toHaveBeenCalledWith(
        "test-user-id",
        50,
        true,
      );
    });

    it("uses default limit of 50", async () => {
      vi.mocked(conversationsDAL.list).mockResolvedValue([]);

      const { GET } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations");
      await GET(req, { params: Promise.resolve({}) });

      expect(conversationsDAL.list).toHaveBeenCalledWith(
        "test-user-id",
        50,
        false,
      );
    });

    it("includes cache headers", async () => {
      vi.mocked(conversationsDAL.list).mockResolvedValue([]);

      const { GET } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations");
      const response = await GET(req, { params: Promise.resolve({}) });

      expect(response.headers.get("Cache-Control")).toBeTruthy();
    });
  });

  describe("POST /api/v1/conversations", () => {
    it("creates conversation with 201 status", async () => {
      const mockResult = {
        status: "success" as const,
        sys: { entity: "conversation", id: "new-conv" },
        data: {
          _id: "new-conv",
          title: "New Chat",
          model: "gpt-4o",
          _creationTime: Date.now(),
        },
      };
      vi.mocked(conversationsDAL.create).mockResolvedValue(mockResult);

      const { POST } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: { model: "gpt-4o", title: "New Chat" },
      });
      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(201);
      assertEnvelopeSuccess(json);
      expect(json.sys.entity).toBe("conversation");
    });

    it("calls DAL with validated data", async () => {
      const mockResult = {
        status: "success" as const,
        sys: { entity: "conversation", id: "conv-123" },
        data: { _id: "conv-123", model: "gpt-4o" },
      };
      vi.mocked(conversationsDAL.create).mockResolvedValue(mockResult);

      const { POST } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-4o",
          title: "Test Conversation",
          systemPrompt: "You are a helpful assistant",
        },
      });
      await POST(req, { params: Promise.resolve({}) });

      expect(conversationsDAL.create).toHaveBeenCalledWith("test-user-id", {
        model: "gpt-4o",
        title: "Test Conversation",
        systemPrompt: "You are a helpful assistant",
      });
    });

    it("rejects request missing required model field", async () => {
      const { POST } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: { title: "No Model" },
      });
      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(400);
      assertEnvelopeError(json);
    });

    it("rejects invalid model type", async () => {
      const { POST } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: { model: 123 },
      });
      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(400);
      assertEnvelopeError(json);
    });

    it("accepts minimal valid request (only model)", async () => {
      const mockResult = {
        status: "success" as const,
        sys: { entity: "conversation", id: "conv-123" },
        data: { _id: "conv-123", model: "gpt-4o" },
      };
      vi.mocked(conversationsDAL.create).mockResolvedValue(mockResult);

      const { POST } = await import("../conversations/route");
      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: { model: "gpt-4o" },
      });
      const response = await POST(req, { params: Promise.resolve({}) });

      expect(response.status).toBe(201);
    });
  });
});
