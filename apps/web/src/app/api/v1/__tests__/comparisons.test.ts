/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const comparisonsDAL = {
  getComparisonGroup: vi.fn(),
  recordVote: vi.fn(),
  consolidate: vi.fn(),
  listOriginalResponses: vi.fn(),
};

const service = {
  process: vi.fn(),
};

const enqueueProcessing = vi.fn().mockResolvedValue(undefined);

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
  getEnqueueGenerationProcessing: () => enqueueProcessing,
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

  it("returns comparison group state", async () => {
    comparisonsDAL.getComparisonGroup.mockResolvedValueOnce({
      status: "success",
      data: {
        comparisonGroupId: "cmp_1",
        status: "running",
        requestId: "req_1",
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "running",
          },
        },
        latestVote: {
          outcome: "winner",
          winnerMessageId: "msg_1",
          votedAt: 123,
        },
      },
    });

    const { GET } = await import("../comparisons/[comparisonGroupId]/route");
    const response = await GET(createMockRequest("/api/v1/comparisons/cmp_1"), {
      params: Promise.resolve({ comparisonGroupId: "cmp_1" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    const data = unwrapData<{
      comparisonGroupId: string;
      status: string;
      requestId?: string;
      sessionsByMessageId: Record<
        string,
        { sessionId: string; modelId: string; status: string }
      >;
      latestVote?: {
        outcome: string;
        winnerMessageId?: string;
        votedAt: number;
      };
    }>(json);
    expect(data.comparisonGroupId).toBe("cmp_1");
    expect(data.status).toBe("running");
    expect(data.requestId).toBe("req_1");
    expect(data.latestVote?.outcome).toBe("winner");
    expect(comparisonsDAL.getComparisonGroup).toHaveBeenCalledWith(
      "user_123",
      "cmp_1",
    );
  });

  it("records a vote", async () => {
    comparisonsDAL.recordVote.mockResolvedValueOnce({
      status: "success",
      data: {
        comparisonGroupId: "cmp_1",
        winnerMessageId: "msg_2",
        outcome: "winner",
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
          outcome: "winner",
        },
      }),
      { params: Promise.resolve({ comparisonGroupId: "cmp_1" }) },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    const data = unwrapData<{
      comparisonGroupId: string;
      winnerMessageId: string;
      outcome: string;
    }>(json);
    expect(data.comparisonGroupId).toBe("cmp_1");
    expect(comparisonsDAL.recordVote).toHaveBeenCalledWith("user_123", {
      comparisonGroupId: "cmp_1",
      winnerMessageId: "msg_2",
      outcome: "winner",
    });
  });

  it("accepts legacy directional ratings and maps them to winner outcomes", async () => {
    comparisonsDAL.recordVote.mockResolvedValueOnce({
      status: "success",
      data: {
        comparisonGroupId: "cmp_1",
        winnerMessageId: "msg_2",
        outcome: "winner",
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
    expect(comparisonsDAL.recordVote).toHaveBeenCalledWith("user_123", {
      comparisonGroupId: "cmp_1",
      winnerMessageId: "msg_2",
      outcome: "winner",
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
    expect(enqueueProcessing).toHaveBeenCalledWith("req_consolidate");
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
