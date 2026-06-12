/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
const enqueueProcessing = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/api/dal/messages", () => ({
  messagesDAL: {
    update,
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

describe("/api/v1/messages/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("starts an edit branch request and schedules processing", async () => {
    update.mockResolvedValue({
      status: "success",
      sys: { entity: "message", async: true },
      data: {
        requestId: "req_edit",
        conversationId: "conv_1",
        messageId: "msg_user_new",
        assistantMessageId: "msg_assistant_new",
        assistantMessageIds: ["msg_assistant_new"],
        status: "pending",
        pollUrl: "/api/v1/messages/msg_assistant_new",
        streamUrl: "/api/v1/generations/req_edit/stream",
        stopUrl: "/api/v1/generations/req_edit/stop",
      },
    });

    const { PATCH } = await import("../messages/[id]/route");
    const response = await PATCH(
      createMockRequest("/api/v1/messages/msg_old", {
        method: "PATCH",
        body: { content: "Edited content", modelId: "openai:gpt-5" },
      }),
      { params: Promise.resolve({ id: "msg_old" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(update).toHaveBeenCalledWith("user_1", "msg_old", "Edited content", {
      modelId: "openai:gpt-5",
    });
    expect(enqueueProcessing).toHaveBeenCalledWith("req_edit");
    expect(json.data).toMatchObject({
      requestId: "req_edit",
      assistantMessageId: "msg_assistant_new",
      status: "pending",
    });
  });
});
