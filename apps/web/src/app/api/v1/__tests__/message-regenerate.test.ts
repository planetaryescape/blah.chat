/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const regenerate = vi.fn();
const enqueueProcessing = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/api/dal/messages", () => ({
  messagesDAL: {
    regenerate,
  },
}));

vi.mock("@/lib/generation-v2/runtime", () => ({
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

vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) =>
      handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "user_1",
        sessionToken: "token_1",
      }),
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

import { createMockRequest } from "@/lib/test/api-helpers";

describe("/api/v1/messages/[id]/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("starts a regeneration request and schedules processing", async () => {
    regenerate.mockResolvedValue({
      status: "success",
      sys: { entity: "message", async: true },
      data: {
        requestId: "req_regen",
        conversationId: "conv_1",
        messageId: "msg_user",
        assistantMessageId: "msg_new",
        assistantMessageIds: ["msg_new"],
        status: "pending",
        pollUrl: "/api/v1/messages/msg_new",
        streamUrl: "/api/v1/generations/req_regen/stream",
        stopUrl: "/api/v1/generations/req_regen/stop",
      },
    });

    const { POST } = await import("../messages/[id]/regenerate/route");
    const response = await POST(
      createMockRequest("/api/v1/messages/msg_old/regenerate", {
        method: "POST",
        body: { modelId: "openai:gpt-5" },
      }),
      { params: Promise.resolve({ id: "msg_old" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(regenerate).toHaveBeenCalledWith(
      "user_1",
      "msg_old",
      "openai:gpt-5",
    );
    expect(enqueueProcessing).toHaveBeenCalledWith("req_regen");
    expect(json.data).toMatchObject({
      requestId: "req_regen",
      assistantMessageId: "msg_new",
      status: "pending",
    });
  });
});
