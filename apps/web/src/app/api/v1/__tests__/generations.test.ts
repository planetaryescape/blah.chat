/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const service = {
  start: vi.fn(),
  process: vi.fn(),
  stop: vi.fn(),
  stopSession: vi.fn(),
  streamToSse: vi.fn(async (_requestId, _signal, send) => {
    await send("generation", { type: "start", requestId: "req_1" });
  }),
  repository: {
    getRequestBundle: vi.fn(),
  },
};

vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    after: vi.fn((callback: () => Promise<void> | void) => {
      void callback();
    }),
  };
});

const enqueueProcessing = vi.fn();

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: vi.fn(() => service),
  getEnqueueGenerationProcessing: vi.fn(() => enqueueProcessing),
}));

vi.mock("@/lib/generation-v2/clerk", () => ({
  getCurrentClerkUserProfile: vi.fn(async () => ({
    clerkId: "user_123",
    email: "user@example.com",
    name: "User",
  })),
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withUserAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) => {
      return handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "user_123",
      });
    },
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

describe("/api/v1/generations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a generation request and enqueues durable processing", async () => {
    service.start.mockResolvedValueOnce({
      requestId: "req_1",
      conversationId: "conv_1",
      userMessageId: "msg_user",
      assistantMessageIds: ["msg_assistant"],
      modelIds: ["openai:gpt-5-mini"],
    });
    enqueueProcessing.mockResolvedValueOnce(undefined);

    const { POST } = await import("../generations/route");
    const response = await POST(
      createMockRequest("/api/v1/generations", {
        method: "POST",
        body: {
          conversationId: "conv_1",
          content: "Hello",
          modelId: "openai:gpt-5-mini",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(202);
    const json = await response.json();
    const data = unwrapData<{
      requestId: string;
      streamUrl: string;
      stopUrl: string;
    }>(json);
    expect(data.requestId).toBe("req_1");
    expect(data.streamUrl).toBe("/api/v1/generations/req_1/stream");
    expect(enqueueProcessing).toHaveBeenCalledWith("req_1");
    expect(service.process).not.toHaveBeenCalled();
  });

  it("streams generation events over SSE", async () => {
    service.repository.getRequestBundle.mockResolvedValueOnce({
      requestId: "req_1",
    });

    const { GET } = await import("../generations/[requestId]/stream/route");
    const response = await GET(
      createMockRequest("/api/v1/generations/req_1/stream"),
      { params: Promise.resolve({ requestId: "req_1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("marks a generation request as stopping", async () => {
    service.repository.getRequestBundle.mockResolvedValueOnce({
      requestId: "req_1",
    });

    const { POST } = await import("../generations/[requestId]/stop/route");
    const response = await POST(
      createMockRequest("/api/v1/generations/req_1/stop", {
        method: "POST",
      }),
      { params: Promise.resolve({ requestId: "req_1" }) },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    const data = unwrapData<{ status: string }>(json);
    expect(data.status).toBe("cancelling");
    expect(service.stop).toHaveBeenCalledWith("req_1");
  });

  it("marks one comparison child session as stopping", async () => {
    service.repository.getRequestBundle.mockResolvedValueOnce({
      requestId: "req_1",
      sessions: [{ sessionId: "sess_1" }],
    });

    const { POST } = await import(
      "../generations/[requestId]/sessions/[sessionId]/stop/route"
    );
    const response = await POST(
      createMockRequest("/api/v1/generations/req_1/sessions/sess_1/stop", {
        method: "POST",
      }),
      { params: Promise.resolve({ requestId: "req_1", sessionId: "sess_1" }) },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    const data = unwrapData<{ status: string; sessionId: string }>(json);
    expect(data.status).toBe("cancelling");
    expect(data.sessionId).toBe("sess_1");
    expect(service.stopSession).toHaveBeenCalledWith("req_1", "sess_1");
  });
});
