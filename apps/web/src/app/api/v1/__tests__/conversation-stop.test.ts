/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const stop = vi.fn();
const findLatestActiveRequestForConversation = vi.fn();

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: () => ({
    stop,
    repository: {
      findLatestActiveRequestForConversation,
    },
  }),
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withUserAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) =>
      handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "clerk-user-1",
      }),
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

import { createMockRequest } from "@/lib/test/api-helpers";

describe("/api/v1/conversations/[id]/stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops latest active request for the conversation", async () => {
    findLatestActiveRequestForConversation.mockResolvedValue({
      id: "req_123",
      status: "running",
      clerkId: "clerk-user-1",
    });

    const { POST } = await import("../conversations/[id]/stop/route");
    const response = await POST(
      createMockRequest("/api/v1/conversations/conv_123/stop", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ id: "conv_123" }),
      },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(findLatestActiveRequestForConversation).toHaveBeenCalledWith(
      "conv_123",
      "clerk-user-1",
    );
    expect(stop).toHaveBeenCalledWith("req_123");
    expect(json.data).toMatchObject({
      stopped: true,
      conversationId: "conv_123",
      requestId: "req_123",
    });
  });

  it("returns stopped false when nothing active exists", async () => {
    findLatestActiveRequestForConversation.mockResolvedValue(null);

    const { POST } = await import("../conversations/[id]/stop/route");
    const response = await POST(
      createMockRequest("/api/v1/conversations/conv_123/stop", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ id: "conv_123" }),
      },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(stop).not.toHaveBeenCalled();
    expect(json.data).toMatchObject({
      stopped: false,
      conversationId: "conv_123",
    });
    expect(json.data.requestId).toBeUndefined();
  });
});
