/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  routingFeedback,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGenerationV2Repository } from "@/lib/generation-v2/repository";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
let getTokenMock = vi.fn();
let processMock = vi.fn();
let stopSessionMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
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

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: () => {
    const repository = createGenerationV2Repository(db);

    return {
      repository,
      startSameChatConsolidation: async (input: {
        comparisonGroupId: string;
        consolidationModel: string;
      }) => repository.createSameChatConsolidationRequest(input),
      startNewConversationConsolidation: async (input: {
        userId: string;
        comparisonGroupId: string;
        consolidationModel: string;
      }) => repository.createNewConversationConsolidationRequest(input),
      recordVote: async (input: {
        userId: string;
        comparisonGroupId: string;
        winnerMessageId?: string | null;
        rating: "left_better" | "right_better" | "tie" | "both_bad";
      }) => repository.recordVote(input),
      getOriginalResponses: async (consolidatedMessageId: string) =>
        repository.listOriginalResponses(consolidatedMessageId),
      process: processMock,
      stopSession: stopSessionMock,
    };
  },
}));

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

vi.mock("server-only", () => ({}));

describe("comparison auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    getTokenMock = vi.fn(async () => {
      throw new Error("Convex token should not be requested");
    });
    processMock = vi.fn(async () => undefined);
    stopSessionMock = vi.fn(async () => undefined);

    authMock.mockResolvedValue({
      userId: "clerk_phase8",
      getToken: getTokenMock,
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_phase8",
      primaryEmailAddress: { emailAddress: "phase8@example.com" },
      fullName: "Phase Eight",
      firstName: "Phase",
      lastName: "Eight",
      imageUrl: "https://example.com/phase8.png",
    });
  });

  async function seedComparison() {
    const repository = createGenerationV2Repository(db);
    const user = await repository.upsertUser({
      clerkId: "clerk_phase8",
      email: "phase8@example.com",
      name: "Phase Eight",
      imageUrl: "https://example.com/phase8.png",
    });
    const conversation = await createConversationRepository(db).create({
      userId: user.id,
      title: "Compare Chat",
      model: "gpt-5",
    });
    const started = await repository.createRequest({
      clerkUser: {
        clerkId: "clerk_phase8",
        email: "phase8@example.com",
        name: "Phase Eight",
        imageUrl: "https://example.com/phase8.png",
      },
      conversationId: conversation.id,
      content: "Compare these answers",
      models: ["openai:gpt-5", "anthropic:claude-sonnet-4"],
    });
    const bundle = await repository.getRequestBundle(
      started.requestId,
      "clerk_phase8",
    );
    for (const session of bundle?.sessions ?? []) {
      const decision = await repository.getOrCreateRoutingDecision({
        requestId: started.requestId,
        conversationId: conversation.id,
        userId: user.id,
        selectedModelId: session.modelId,
        routeLabel: "explicit",
        details: {
          seededBy: "comparisons.auth.test",
        },
      });
      await repository.upsertRoutingOutcome({
        decisionId: decision.id,
        requestId: started.requestId,
        sessionId: session.sessionId,
        status: "complete",
        ttftMs: 100,
        latencyMs: 200,
      });
    }
    const assistantMessages = await db.query.messages.findMany({
      where: (table, { inArray }) =>
        inArray(table.id, started.assistantMessageIds),
      orderBy: (table, { asc }) => [asc(table.siblingIndex)],
    });

    return {
      repository,
      user,
      conversation,
      started,
      bundle: bundle!,
      assistantMessages,
      comparisonGroupId: assistantMessages[0]?.comparisonGroupId ?? "",
    };
  }

  it("stops one comparison child session through the real session-stop route", async () => {
    const { bundle, started } = await seedComparison();
    const stopSessionId = bundle.sessions[0]?.sessionId;
    expect(stopSessionId).toBeTruthy();

    const { POST } = await import(
      "../generations/[requestId]/sessions/[sessionId]/stop/route"
    );
    const response = await POST(
      createMockRequest(
        `/api/v1/generations/${started.requestId}/sessions/${stopSessionId}/stop`,
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({
          requestId: started.requestId,
          sessionId: stopSessionId!,
        }),
      },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(
      unwrapData<{ requestId: string; sessionId: string; status: string }>(
        json,
      ),
    ).toEqual({
      requestId: started.requestId,
      sessionId: stopSessionId!,
      status: "cancelling",
    });
    expect(stopSessionMock).toHaveBeenCalledWith(
      started.requestId,
      stopSessionId,
    );
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("records a vote, starts same-chat consolidation, and lists original responses", async () => {
    const { assistantMessages, comparisonGroupId } = await seedComparison();
    const winnerMessageId = assistantMessages[0]?.id;

    const { POST: vote } = await import(
      "../comparisons/[comparisonGroupId]/vote/route"
    );
    const { POST: consolidate } = await import(
      "../comparisons/[comparisonGroupId]/consolidate/route"
    );
    const { GET: originalResponses } = await import(
      "../messages/[id]/original-responses/route"
    );

    const voteResponse = await vote(
      createMockRequest(`/api/v1/comparisons/${comparisonGroupId}/vote`, {
        method: "POST",
        body: {
          winnerMessageId,
          rating: "left_better",
        },
      }),
      { params: Promise.resolve({ comparisonGroupId }) },
    );

    expect(voteResponse.status).toBe(200);
    const voteJson = await voteResponse.json();
    expect(
      unwrapData<{
        comparisonGroupId: string;
        winnerMessageId?: string | null;
        rating: string;
      }>(voteJson),
    ).toMatchObject({
      comparisonGroupId,
      winnerMessageId,
      rating: "left_better",
    });

    const feedbackRows = await db
      .select()
      .from(routingFeedback)
      .where(eq(routingFeedback.comparisonGroupId, comparisonGroupId));
    expect(feedbackRows).toHaveLength(2);
    expect(feedbackRows.map((row) => row.signal).sort()).toEqual([
      "loss",
      "win",
    ]);
    expect(feedbackRows.every((row) => row.outcomeId)).toBe(true);
    expect(
      feedbackRows.find((row) => row.signal === "win")?.winnerMessageId,
    ).toBe(winnerMessageId);

    const consolidateResponse = await consolidate(
      createMockRequest(
        `/api/v1/comparisons/${comparisonGroupId}/consolidate`,
        {
          method: "POST",
          body: {
            consolidationModel: "openai:gpt-5-mini",
            mode: "same-chat",
          },
        },
      ),
      { params: Promise.resolve({ comparisonGroupId }) },
    );

    expect(consolidateResponse.status).toBe(202);
    const consolidateJson = await consolidateResponse.json();
    const consolidation = unwrapData<{
      requestId: string;
      conversationId: string;
      messageId: string;
      assistantMessageIds: string[];
    }>(consolidateJson);
    expect(consolidation.messageId).toBe(consolidation.assistantMessageIds[0]);
    expect(processMock).toHaveBeenCalledWith(consolidation.requestId);

    const originalResponse = await originalResponses(
      createMockRequest(
        `/api/v1/messages/${consolidation.messageId}/original-responses`,
      ),
      { params: Promise.resolve({ id: consolidation.messageId }) },
    );

    expect(originalResponse.status).toBe(200);
    const originalJson = (await originalResponse.json()) as {
      data: Array<{ data: { _id: string } }>;
    };
    expect(originalJson.data.map((message) => message.data._id)).toEqual(
      assistantMessages.map((message) => message.id),
    );
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("creates a new-chat consolidation conversation and exposes its seeded thread", async () => {
    const { comparisonGroupId, conversation } = await seedComparison();

    const { POST: consolidate } = await import(
      "../comparisons/[comparisonGroupId]/consolidate/route"
    );
    const { GET: getConversation } = await import(
      "../conversations/[id]/route"
    );
    const { GET: listMessages } = await import(
      "../conversations/[id]/messages/route"
    );

    const consolidateResponse = await consolidate(
      createMockRequest(
        `/api/v1/comparisons/${comparisonGroupId}/consolidate`,
        {
          method: "POST",
          body: {
            consolidationModel: "openai:gpt-5-mini",
            mode: "new-chat",
          },
        },
      ),
      { params: Promise.resolve({ comparisonGroupId }) },
    );

    expect(consolidateResponse.status).toBe(202);
    const consolidateJson = await consolidateResponse.json();
    const consolidation = unwrapData<{
      mode: "new-chat";
      requestId: string;
      conversationId: string;
      assistantMessageIds: string[];
    }>(consolidateJson);
    expect(consolidation.mode).toBe("new-chat");
    expect(consolidation.conversationId).not.toBe(conversation.id);
    expect(processMock).toHaveBeenCalledWith(consolidation.requestId);

    const conversationResponse = await getConversation(
      createMockRequest(
        `/api/v1/conversations/${consolidation.conversationId}`,
      ),
      { params: Promise.resolve({ id: consolidation.conversationId }) },
    );

    expect(conversationResponse.status).toBe(200);
    const conversationJson = await conversationResponse.json();
    const consolidatedConversation = unwrapData<{
      _id: string;
      title: string;
      model: string;
    }>(conversationJson);
    expect(consolidatedConversation).toMatchObject({
      _id: consolidation.conversationId,
      model: "openai:gpt-5-mini",
    });
    expect(consolidatedConversation.title).toContain("Consolidation:");

    const messagesResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${consolidation.conversationId}/messages`,
      ),
      { params: Promise.resolve({ id: consolidation.conversationId }) },
    );

    expect(messagesResponse.status).toBe(200);
    const messagesJson = (await messagesResponse.json()) as Array<{
      data: {
        _id: string;
        role: string;
        status: string;
        isActiveBranch: boolean;
      };
    }>;
    expect(messagesJson).toHaveLength(2);
    expect(messagesJson.map((message) => message.data.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(messagesJson[1]?.data._id).toBe(
      consolidation.assistantMessageIds[0],
    );
    expect(messagesJson.every((message) => message.data.isActiveBranch)).toBe(
      true,
    );
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});
