/**
 * @vitest-environment node
 */
import { createConversationRepository } from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type { GenerationProvider } from "../types";

class CountingProvider implements GenerationProvider {
  public callCount = 0;
  constructor(private readonly outputs: Record<string, string[]>) {}

  async *streamText(input: { modelId: string }) {
    this.callCount += 1;
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }
}

async function setupService(provider: GenerationProvider) {
  const db = await createTestPersistenceDb();
  const conversations = createConversationRepository(db);
  const store = new MemoryGenerationEventStore();

  let time = 1_000;
  const now = () => {
    time += 100;
    return time;
  };

  const service = new GenerationV2Service(
    db,
    store,
    provider,
    async () => {},
    now,
  );

  const user = await (service as any).repository.upsertUser({
    clerkId: "user_idempotency",
    email: "idempotency@test.com",
    name: "Idempotency Tester",
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: "Test",
    model: "openai:gpt-5-mini",
  });

  return { service, db, store, conversation, user };
}

describe("GenerationV2Service.process idempotency", () => {
  it("does not invoke the provider a second time when called on a completed request", async () => {
    const provider = new CountingProvider({
      "openai:gpt-5-mini": ["Hello", " world"],
    });
    const { service, conversation } = await setupService(provider);

    const started = await service.start({
      clerkUser: {
        clerkId: "user_idempotency",
        email: "idempotency@test.com",
        name: "Idempotency Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const firstStatus = await service.process(started.requestId);
    expect(firstStatus).toBe("complete");
    expect(provider.callCount).toBe(1);

    const secondStatus = await service.process(started.requestId);
    expect(secondStatus).toBe("complete");
    expect(provider.callCount).toBe(1);
  });

  it("concurrent process calls invoke the provider only once (atomic claim)", async () => {
    const provider = new CountingProvider({
      "openai:gpt-5-mini": ["Hello", " world"],
    });
    const { service, conversation } = await setupService(provider);

    const started = await service.start({
      clerkUser: {
        clerkId: "user_idempotency",
        email: "idempotency@test.com",
        name: "Idempotency Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const [resultA, resultB] = await Promise.all([
      service.process(started.requestId),
      service.process(started.requestId),
    ]);

    expect(provider.callCount).toBe(1);
    expect([resultA, resultB]).toContain("complete");
  });

  it("does not process sessions when the request is already running (re-entrancy guard)", async () => {
    const provider = new CountingProvider({
      "openai:gpt-5-mini": ["Hello", " world"],
    });
    const { service, conversation } = await setupService(provider);

    const started = await service.start({
      clerkUser: {
        clerkId: "user_idempotency",
        email: "idempotency@test.com",
        name: "Idempotency Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    // Simulate another worker owning the request: it already claimed
    // pending -> running, so this invocation must not stream anything.
    await service.repository.updateRequestStatus(started.requestId, "running");

    const status = await service.process(started.requestId);

    expect(status).toBe("running");
    expect(provider.callCount).toBe(0);
  });

  it("skips sessions that already reached a terminal status", async () => {
    const provider = new CountingProvider({
      "openai:gpt-5-mini": ["Hello", " world"],
    });
    const { service, conversation } = await setupService(provider);

    const started = await service.start({
      clerkUser: {
        clerkId: "user_idempotency",
        email: "idempotency@test.com",
        name: "Idempotency Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const bundle = await service.repository.getRequestBundle(started.requestId);
    const session = bundle?.sessions[0];
    expect(session).toBeTruthy();

    await service.repository.updateSessionStatus(
      session!.sessionId,
      "cancelled",
    );
    await service.repository.updateAssistantMessage({
      assistantMessageId: session!.assistantMessageId,
      content: "partial before cancel",
      status: "cancelled",
    });

    const status = await service.process(started.requestId);

    expect(provider.callCount).toBe(0);
    expect(status).toBe("cancelled");

    const assistants = await service.repository.getAssistantMessagesForRequest(
      started.requestId,
    );
    expect(assistants[0]).toMatchObject({
      content: "partial before cancel",
      status: "cancelled",
    });
  });
});
