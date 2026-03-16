/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const comparisonsDAL = {
  recordVote: vi.fn(),
  consolidate: vi.fn(),
  listOriginalResponses: vi.fn(),
};

const service = {
  process: vi.fn(),
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

vi.mock("@/lib/api/dal/comparisons", () => ({
  comparisonsDAL,
}));

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: vi.fn(() => service),
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

describe("/api/v1/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a vote", async () => {
    comparisonsDAL.recordVote.mockResolvedValueOnce({
      status: "success",
      data: {
        comparisonGroupId: "cmp_1",
        winnerMessageId: "msg_2",
        rating: "left_better",
      },
    });

    const { POST } = await import(
      "../comparisons/[comparisonGroupId]/vote/route"
    );
    const response = await POST(
      createMockRequest("/api/v1/comparisons/cmp_1/vote", {
        method: "POST",
        body: {
          winnerMessageId: "msg_2",
          rating: "left_better",
        },
      }),
      { params: Promise.resolve({ comparisonGroupId: "cmp_1" }) },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    const data = unwrapData<{
      comparisonGroupId: string;
      winnerMessageId: string;
      rating: string;
    }>(json);
    expect(data.comparisonGroupId).toBe("cmp_1");
    expect(comparisonsDAL.recordVote).toHaveBeenCalledWith("user_123", {
      comparisonGroupId: "cmp_1",
      winnerMessageId: "msg_2",
      rating: "left_better",
    });
  });

  it("creates a consolidation request and schedules processing", async () => {
    comparisonsDAL.consolidate.mockResolvedValueOnce({
      status: "success",
      data: {
        requestId: "req_consolidate",
        conversationId: "conv_1",
        messageId: "msg_new",
        streamUrl: "/api/v1/generations/req_consolidate/stream",
        stopUrl: "/api/v1/generations/req_consolidate/stop",
      },
    });

    const { POST } = await import(
      "../comparisons/[comparisonGroupId]/consolidate/route"
    );
    const response = await POST(
      createMockRequest("/api/v1/comparisons/cmp_1/consolidate", {
        method: "POST",
        body: {
          consolidationModel: "openai:gpt-5-mini",
          mode: "same-chat",
        },
      }),
      { params: Promise.resolve({ comparisonGroupId: "cmp_1" }) },
    );

    expect(response.status).toBe(202);
    const json = await response.json();
    const data = unwrapData<{ requestId: string; conversationId: string }>(
      json,
    );
    expect(data.requestId).toBe("req_consolidate");
    expect(service.process).toHaveBeenCalledWith("req_consolidate");
  });

  it("returns original responses for a consolidated message", async () => {
    comparisonsDAL.listOriginalResponses.mockResolvedValueOnce({
      status: "success",
      data: [
        {
          sys: { entity: "message", id: "msg_1" },
          data: {
            _id: "msg_1",
            role: "assistant",
            content: "first",
            createdAt: 1,
            updatedAt: 1,
            _creationTime: 1,
          },
        },
      ],
    });

    const { GET } = await import("../messages/[id]/original-responses/route");
    const response = await GET(
      createMockRequest("/api/v1/messages/msg_merge/original-responses"),
      { params: Promise.resolve({ id: "msg_merge" }) },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("success");
    expect(comparisonsDAL.listOriginalResponses).toHaveBeenCalledWith(
      "user_123",
      "msg_merge",
    );
  });
});
