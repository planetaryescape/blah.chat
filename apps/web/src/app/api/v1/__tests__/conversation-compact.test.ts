/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const conversationsDAL = {
  compact: vi.fn(),
};

vi.mock("@/lib/api/dal/conversations", () => ({
  conversationsDAL,
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withUserAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) =>
      handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "user_123",
      }),
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

describe("/api/v1/conversations/:id/compact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("compacts a conversation and returns the new conversation id", async () => {
    conversationsDAL.compact.mockResolvedValueOnce({
      status: "success",
      data: {
        conversationId: "conv_new",
        messageId: "msg_recap",
      },
    });

    const { POST } = await import("../conversations/[id]/compact/route");
    const response = await POST(
      createMockRequest("/api/v1/conversations/conv_1/compact", {
        method: "POST",
        body: {
          targetModel: "openai:gpt-5-mini",
        },
      }),
      { params: Promise.resolve({ id: "conv_1" }) },
    );

    expect(response.status).toBe(202);
    const json = await response.json();
    const data = unwrapData<{ conversationId: string }>(json);
    expect(data.conversationId).toBe("conv_new");
    expect(conversationsDAL.compact).toHaveBeenCalledWith(
      "user_123",
      "conv_1",
      "openai:gpt-5-mini",
    );
  });
});
