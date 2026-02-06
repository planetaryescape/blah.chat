/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test/api-helpers";

const queryMock = vi.fn();

vi.mock("@/lib/api/convex", () => ({
  getAuthenticatedConvexClient: vi.fn(() => ({
    query: queryMock,
  })),
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) => {
      return handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "user_123",
        sessionToken: "token_123",
      });
    },
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

vi.mock("@/lib/api/sse/utils", () => ({
  createHeartbeatLoop: vi.fn(() => 0 as any),
  createPollingLoop: vi.fn(() => 0 as any),
  setupSSECleanup: vi.fn(),
  createSSEResponse: vi.fn(() => ({
    response: new Response("", {
      headers: {
        "Content-Type": "text/event-stream",
      },
    }),
    send: vi.fn(async () => {}),
    sendError: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    isClosed: vi.fn(() => false),
  })),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("/api/v1/messages/stream/[conversationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when conversation is not owned", async () => {
    queryMock.mockResolvedValueOnce(null);

    const { GET } = await import("../messages/stream/[conversationId]/route");
    const req = createMockRequest("/api/v1/messages/stream/conv_1");

    const response = await GET(req, {
      params: Promise.resolve({ conversationId: "conv_1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns SSE stream when ownership validation passes", async () => {
    queryMock
      .mockResolvedValueOnce({ _id: "conv_1", userId: "user_123" })
      .mockResolvedValueOnce([])
      .mockResolvedValue([]);

    const { GET } = await import("../messages/stream/[conversationId]/route");
    const req = createMockRequest("/api/v1/messages/stream/conv_1");

    const response = await GET(req, {
      params: Promise.resolve({ conversationId: "conv_1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
  });
});
