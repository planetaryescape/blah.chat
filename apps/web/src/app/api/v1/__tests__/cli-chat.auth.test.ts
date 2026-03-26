/**
 * @vitest-environment node
 */
import { createConversationRepository } from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGenerationV2Repository } from "@/lib/generation-v2/repository";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const processMock = vi.fn();
const streamToSseMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

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
    streamToSse: streamToSseMock,
    repository: createGenerationV2Repository(db),
  }),
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

describe("CLI chat API-key routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    processMock.mockResolvedValue(undefined);
    streamToSseMock.mockImplementation(
      async (
        requestId: string,
        _signal: AbortSignal,
        send: (event: string, data: unknown) => Promise<void>,
      ) => {
        await send("generation", {
          type: "checkpoint",
          requestId,
          sessionId: "sess_cli",
          assistantMessageId: "msg_cli",
          modelId: "openai:gpt-5-mini",
          seq: 1,
          ts: 123,
          content: "partial",
        });
      },
    );
  });

  it("sends, discovers, and streams a CLI generation request through Postgres routes", async () => {
    const { createHash } = await import("node:crypto");
    const { cliApiKeys } = await import("@blah-chat/persistence-postgres");

    const repo = createGenerationV2Repository(db);
    const user = await repo.upsertUser({
      clerkId: "clerk_cli_1",
      email: "cli@example.com",
      name: "CLI User",
    });

    // Seed an API key so apiKeyAuth middleware can validate it
    const apiKey = "blah_valid";
    await db.insert(cliApiKeys).values({
      userId: user.id,
      keyHash: createHash("sha256").update(apiKey).digest("hex"),
      keyPrefix: apiKey.slice(0, 12),
      name: "Test CLI Key",
      createdAt: Date.now(),
    });
    const conversation = await createConversationRepository(db).create({
      userId: user.id,
      title: "CLI Chat",
      model: "openai:gpt-5-mini",
    });

    const { POST: sendCliMessage } = await import(
      "../cli/conversations/[id]/messages/route"
    );
    const { GET: getCliActiveGeneration } = await import(
      "../cli/conversations/[id]/active-generation/route"
    );
    const { GET: streamCliGeneration } = await import(
      "../cli/generations/[requestId]/stream/route"
    );

    const sendResponse = await sendCliMessage(
      createMockRequest(
        `/api/v1/cli/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          body: {
            content: "Hello from CLI",
            modelId: "openai:gpt-5-mini",
          },
          headers: {
            "x-api-key": "blah_valid",
          },
        },
      ),
      {
        params: Promise.resolve({ id: conversation.id }),
      },
    );

    expect(sendResponse.status).toBe(202);
    const sendJson = await sendResponse.json();
    const started = unwrapData<{
      requestId: string;
      conversationId: string;
      streamUrl: string;
      status: string;
    }>(sendJson);
    expect(started.conversationId).toBe(conversation.id);
    expect(started.streamUrl).toBe(
      `/api/v1/cli/generations/${started.requestId}/stream`,
    );

    const activeResponse = await getCliActiveGeneration(
      createMockRequest(
        `/api/v1/cli/conversations/${conversation.id}/active-generation`,
        {
          headers: {
            "x-api-key": "blah_valid",
          },
        },
      ),
      {
        params: Promise.resolve({ id: conversation.id }),
      },
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
      conversationId: conversation.id,
      requestId: started.requestId,
      streamUrl: `/api/v1/cli/generations/${started.requestId}/stream`,
      status: "pending",
    });

    const streamResponse = await streamCliGeneration(
      createMockRequest(`/api/v1/cli/generations/${started.requestId}/stream`, {
        headers: {
          "x-api-key": "blah_valid",
        },
      }),
      {
        params: Promise.resolve({ requestId: started.requestId }),
      },
    );

    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get("Content-Type")).toContain(
      "text/event-stream",
    );
    expect(processMock).toHaveBeenCalledWith(started.requestId);
  });
});
