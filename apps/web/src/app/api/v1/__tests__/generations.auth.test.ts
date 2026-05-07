/**
 * @vitest-environment node
 */
import { createConversationRepository } from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGenerationV2Repository } from "@/lib/generation-v2/repository";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
let getTokenMock = vi.fn();
let processMock = vi.fn();
let stopMock = vi.fn();
let stopSessionMock = vi.fn();
let streamToSseMock = vi.fn();
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
  getGenerationV2Service: () => ({
    start: async (
      input: Parameters<
        ReturnType<typeof createGenerationV2Repository>["createRequest"]
      >[0],
    ) => createGenerationV2Repository(db).createRequest(input),
    process: processMock,
    stop: stopMock,
    stopSession: stopSessionMock,
    streamToSse: streamToSseMock,
    repository: createGenerationV2Repository(db),
  }),
  getEnqueueGenerationProcessing: () => async (requestId: string) => {
    await processMock(requestId);
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

vi.mock("server-only", () => ({}));

describe("generation auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    getTokenMock = vi.fn(async () => {
      throw new Error("Convex token should not be requested");
    });
    processMock = vi.fn(async () => undefined);
    stopMock = vi.fn(async () => undefined);
    stopSessionMock = vi.fn(async () => undefined);
    streamToSseMock = vi.fn(
      async (
        requestId: string,
        _signal: AbortSignal,
        send: (event: string, data: unknown) => Promise<void>,
      ) => {
        await send("generation", {
          type: "checkpoint",
          requestId,
          content: "partial",
        });
      },
    );

    authMock.mockResolvedValue({
      userId: "clerk_phase7",
      getToken: getTokenMock,
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_phase7",
      primaryEmailAddress: { emailAddress: "phase7@example.com" },
      fullName: "Phase Seven",
      firstName: "Phase",
      lastName: "Seven",
      imageUrl: "https://example.com/phase7.png",
    });
  });

  it("creates, streams, and stops a generation through the real route surface", async () => {
    const { POST: createConversation } = await import("../conversations/route");
    const { POST: createGeneration } = await import("../generations/route");
    const { GET: streamGeneration } = await import(
      "../generations/[requestId]/stream/route"
    );
    const { POST: stopGeneration } = await import(
      "../generations/[requestId]/stop/route"
    );

    const createConversationResponse = await createConversation(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Generation Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createConversationResponse.status).toBe(201);
    const createConversationJson = await createConversationResponse.json();
    const createdConversation = unwrapData<{ _id: string }>(
      createConversationJson,
    );

    const generationResponse = await createGeneration(
      createMockRequest("/api/v1/generations", {
        method: "POST",
        body: {
          conversationId: createdConversation._id,
          content: "Stream this",
          modelId: "openai:gpt-5",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(generationResponse.status).toBe(202);
    const generationJson = await generationResponse.json();
    const generation = unwrapData<{
      requestId: string;
      conversationId: string;
      userMessageId: string;
      assistantMessageIds: string[];
      streamUrl: string;
      stopUrl: string;
    }>(generationJson);

    expect(generation.conversationId).toBe(createdConversation._id);
    expect(generation.streamUrl).toBe(
      `/api/v1/generations/${generation.requestId}/stream`,
    );
    expect(generation.stopUrl).toBe(
      `/api/v1/generations/${generation.requestId}/stop`,
    );
    expect(processMock).toHaveBeenCalledWith(generation.requestId);

    const streamResponse = await streamGeneration(
      createMockRequest(`/api/v1/generations/${generation.requestId}/stream`),
      { params: Promise.resolve({ requestId: generation.requestId }) },
    );

    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get("Content-Type")).toContain(
      "text/event-stream",
    );
    const streamBody = await streamResponse.text();
    expect(streamBody).toContain("event: generation");
    expect(streamBody).toContain(generation.requestId);

    const stopResponse = await stopGeneration(
      createMockRequest(`/api/v1/generations/${generation.requestId}/stop`, {
        method: "POST",
      }),
      { params: Promise.resolve({ requestId: generation.requestId }) },
    );

    expect(stopResponse.status).toBe(200);
    const stopJson = await stopResponse.json();
    expect(unwrapData<{ requestId: string; status: string }>(stopJson)).toEqual(
      {
        requestId: generation.requestId,
        status: "cancelling",
      },
    );
    expect(stopMock).toHaveBeenCalledWith(generation.requestId);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("creates a comparison request, streams multiplexed session metadata, and stops one child session", async () => {
    streamToSseMock.mockImplementationOnce(
      async (
        requestId: string,
        _signal: AbortSignal,
        send: (event: string, data: unknown) => Promise<void>,
      ) => {
        const bundle = await createGenerationV2Repository(db).getRequestBundle(
          requestId,
          "clerk_phase7",
        );
        expect(bundle?.sessions).toHaveLength(2);

        for (const [index, session] of (bundle?.sessions ?? []).entries()) {
          await send("generation", {
            type: "delta",
            requestId,
            sessionId: session.sessionId,
            assistantMessageId: session.assistantMessageId,
            modelId: session.modelId,
            seq: index,
            delta: `partial-${index}`,
          });
        }
      },
    );

    const { POST: createConversation } = await import("../conversations/route");
    const { POST: createGeneration } = await import("../generations/route");
    const { GET: streamGeneration } = await import(
      "../generations/[requestId]/stream/route"
    );
    const { POST: stopSession } = await import(
      "../generations/[requestId]/sessions/[sessionId]/stop/route"
    );

    const createConversationResponse = await createConversation(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Comparison Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );
    const createConversationJson = await createConversationResponse.json();
    const createdConversation = unwrapData<{ _id: string }>(
      createConversationJson,
    );

    const modelIds = ["openai:gpt-5", "anthropic:claude-sonnet-4"];
    const generationResponse = await createGeneration(
      createMockRequest("/api/v1/generations", {
        method: "POST",
        body: {
          conversationId: createdConversation._id,
          content: "Compare these",
          models: modelIds,
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(generationResponse.status).toBe(202);
    const generationJson = await generationResponse.json();
    const generation = unwrapData<{
      requestId: string;
      assistantMessageIds: string[];
      modelIds: string[];
    }>(generationJson);
    expect(generation.modelIds).toEqual(modelIds);
    expect(generation.assistantMessageIds).toHaveLength(2);

    const bundle = await createGenerationV2Repository(db).getRequestBundle(
      generation.requestId,
      "clerk_phase7",
    );
    expect(bundle?.sessions).toHaveLength(2);
    const sessionId0 = bundle?.sessions.at(0)?.sessionId;
    const sessionId1 = bundle?.sessions.at(1)?.sessionId;
    expect(sessionId0).toBeTruthy();
    expect(sessionId1).toBeTruthy();

    const streamResponse = await streamGeneration(
      createMockRequest(`/api/v1/generations/${generation.requestId}/stream`),
      { params: Promise.resolve({ requestId: generation.requestId }) },
    );

    expect(streamResponse.status).toBe(200);
    const streamBody = await streamResponse.text();
    expect(streamBody).toContain(modelIds[0]);
    expect(streamBody).toContain(modelIds[1]);
    expect(streamBody).toContain(sessionId0!);
    expect(streamBody).toContain(sessionId1!);
    expect(streamBody).toContain(generation.assistantMessageIds[0]!);
    expect(streamBody).toContain(generation.assistantMessageIds[1]!);

    const stopResponse = await stopSession(
      createMockRequest(
        `/api/v1/generations/${generation.requestId}/sessions/${sessionId0}/stop`,
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({
          requestId: generation.requestId,
          sessionId: sessionId0!,
        }),
      },
    );

    expect(stopResponse.status).toBe(200);
    expect(stopSessionMock).toHaveBeenCalledWith(
      generation.requestId,
      sessionId0!,
    );
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("hides another user's generation from stream and stop routes", async () => {
    const conversation = await createConversationRepository(db).create({
      userId: (
        await createGenerationV2Repository(db).upsertUser({
          clerkId: "other_user",
          email: "other@example.com",
          name: "Other User",
        })
      ).id,
      title: "Other Chat",
      model: "gpt-5",
    });

    const started = await createGenerationV2Repository(db).createRequest({
      clerkUser: {
        clerkId: "other_user",
        email: "other@example.com",
        name: "Other User",
      },
      conversationId: conversation.id,
      content: "Not yours",
      modelId: "openai:gpt-5",
    });

    const { GET: streamGeneration } = await import(
      "../generations/[requestId]/stream/route"
    );
    const { POST: stopGeneration } = await import(
      "../generations/[requestId]/stop/route"
    );

    const streamResponse = await streamGeneration(
      createMockRequest(`/api/v1/generations/${started.requestId}/stream`),
      { params: Promise.resolve({ requestId: started.requestId }) },
    );
    const stopResponse = await stopGeneration(
      createMockRequest(`/api/v1/generations/${started.requestId}/stop`, {
        method: "POST",
      }),
      { params: Promise.resolve({ requestId: started.requestId }) },
    );

    expect(streamResponse.status).toBe(404);
    expect(stopResponse.status).toBe(404);
    expect(stopMock).not.toHaveBeenCalled();
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("finds the latest active request for refresh resume without exposing another user's conversation", async () => {
    const { POST: createConversation } = await import("../conversations/route");
    const { POST: createGeneration } = await import("../generations/route");
    const { GET: getActiveGeneration } = await import(
      "../conversations/[id]/active-generation/route"
    );

    const createConversationResponse = await createConversation(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Resume Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );
    const createConversationJson = await createConversationResponse.json();
    const createdConversation = unwrapData<{ _id: string }>(
      createConversationJson,
    );

    const generationResponse = await createGeneration(
      createMockRequest("/api/v1/generations", {
        method: "POST",
        body: {
          conversationId: createdConversation._id,
          content: "Resume this",
          modelId: "openai:gpt-5",
        },
      }),
      { params: Promise.resolve({}) },
    );
    const generationJson = await generationResponse.json();
    const generation = unwrapData<{
      requestId: string;
      streamUrl: string;
    }>(generationJson);

    const activeResponse = await getActiveGeneration(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/active-generation`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(activeResponse.status).toBe(200);
    const activeJson = await activeResponse.json();
    expect(
      unwrapData<{
        conversationId: string;
        requestId: string | null;
        streamUrl: string | null;
        status: string | null;
      }>(activeJson),
    ).toEqual({
      conversationId: createdConversation._id,
      requestId: generation.requestId,
      streamUrl: generation.streamUrl,
      status: "pending",
    });

    const otherConversation = await createConversationRepository(db).create({
      userId: (
        await createGenerationV2Repository(db).upsertUser({
          clerkId: "other_user",
          email: "other@example.com",
          name: "Other User",
        })
      ).id,
      title: "Other Resume Chat",
      model: "gpt-5",
    });

    const otherResponse = await getActiveGeneration(
      createMockRequest(
        `/api/v1/conversations/${otherConversation.id}/active-generation`,
      ),
      { params: Promise.resolve({ id: otherConversation.id }) },
    );

    expect(otherResponse.status).toBe(404);
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});
