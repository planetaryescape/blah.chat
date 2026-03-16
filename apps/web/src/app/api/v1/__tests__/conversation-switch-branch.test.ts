/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const switchBranch = vi.fn();

vi.mock("@/lib/api/dal/conversations", () => ({
  conversationsDAL: {
    switchBranch,
  },
}));

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

import { createMockRequest } from "@/lib/test/api-helpers";

describe("/api/v1/conversations/[id]/switch-branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches the active leaf to the requested message", async () => {
    switchBranch.mockResolvedValue({
      status: "success",
      sys: { entity: "conversation", id: "conv_1" },
      data: {
        conversationId: "conv_1",
        activeLeafMessageId: "msg_2",
      },
    });

    const { POST } = await import("../conversations/[id]/switch-branch/route");
    const response = await POST(
      createMockRequest("/api/v1/conversations/conv_1/switch-branch", {
        method: "POST",
        body: { targetMessageId: "msg_2" },
      }),
      { params: Promise.resolve({ id: "conv_1" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(switchBranch).toHaveBeenCalledWith("user_1", "conv_1", "msg_2");
    expect(json.data).toMatchObject({
      conversationId: "conv_1",
      activeLeafMessageId: "msg_2",
    });
  });
});
