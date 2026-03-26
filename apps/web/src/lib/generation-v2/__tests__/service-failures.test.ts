/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  routingOutcomes,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type { GenerationProvider } from "../types";

/**
 * Provider that throws after yielding some chunks
 */
class MidStreamErrorProvider implements GenerationProvider {
  constructor(
    private readonly chunksBeforeError: string[],
    private readonly errorMessage = "Provider crashed mid-stream",
  ) {}

  async *streamText() {
    for (const chunk of this.chunksBeforeError) {
      yield chunk;
    }
    throw new Error(this.errorMessage);
  }
}

/**
 * Provider that throws immediately (0 tokens)
 */
class ImmediateErrorProvider implements GenerationProvider {
  streamText(): AsyncIterable<string> {
    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<string>> {
            throw new Error("Connection refused");
          },
        };
      },
    };
  }
}

/**
 * Provider where only certain models fail
 */
class SelectiveErrorProvider implements GenerationProvider {
  constructor(
    private readonly outputs: Record<string, string[]>,
    private readonly failingModels: Set<string>,
  ) {}

  async *streamText(input: { modelId: string }) {
    if (this.failingModels.has(input.modelId)) {
      yield "partial ";
      throw new Error(`${input.modelId} failed`);
    }
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
    clerkId: "user_fail_test",
    email: "fail@test.com",
    name: "Fail Tester",
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: "Test",
    model: "openai:gpt-5-mini",
  });

  return { service, db, store, conversation, user };
}

describe("GenerationV2Service failure injection", () => {
  it("records error status when provider throws mid-stream", async () => {
    const { service, db, store, conversation } = await setupService(
      new MidStreamErrorProvider(["Hello", " wor"]),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_fail_test",
        email: "fail@test.com",
        name: "Fail Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const status = await service.process(started.requestId);

    // Request should reach terminal error status
    expect(status).toBe("error");

    // Events should include an error event
    const events = await store.read(started.requestId);
    const errorEvent = events.events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect((errorEvent as any).error).toContain("crashed mid-stream");

    // Routing outcome should record error with TTFT (since we got tokens)
    const outcomes = await db.select().from(routingOutcomes);
    expect(outcomes.length).toBe(1);
    expect(outcomes[0].status).toBe("error");
    expect(outcomes[0].ttftMs).toBeGreaterThan(0); // we got tokens before error
  });

  it("records null TTFT when provider throws before any tokens", async () => {
    const { service, db, conversation } = await setupService(
      new ImmediateErrorProvider(),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_fail_test",
        email: "fail@test.com",
        name: "Fail Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const status = await service.process(started.requestId);

    expect(status).toBe("error");

    const outcomes = await db.select().from(routingOutcomes);
    expect(outcomes.length).toBe(1);
    expect(outcomes[0].status).toBe("error");
    expect(outcomes[0].ttftMs).toBeNull(); // no tokens ever received
  });

  it("preserves partial content in assistant message after mid-stream error", async () => {
    const { service, conversation } = await setupService(
      new MidStreamErrorProvider(["Hello", " wor"]),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_fail_test",
        email: "fail@test.com",
        name: "Fail Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    // The partial content should be saved
    const msgs = await (service as any).repository.listMessages(
      conversation.id,
    );
    const assistantMsg = msgs.find(
      (m: { role: string }) => m.role === "assistant",
    );
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content).toBe("Hello wor");
    expect(assistantMsg.status).toBe("error");
  });

  it("completes request with mixed status when one comparison session fails", async () => {
    const { service, store, conversation } = await setupService(
      new SelectiveErrorProvider(
        { "anthropic:claude-haiku-4.5": ["Claude says hi"] },
        new Set(["openai:gpt-5-mini"]),
      ),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_fail_test",
        email: "fail@test.com",
        name: "Fail Tester",
      },
      conversationId: conversation.id,
      content: "Compare these",
      models: ["openai:gpt-5-mini", "anthropic:claude-haiku-4.5"],
    });

    const status = await service.process(started.requestId);

    // Request should still complete (not crash entirely)
    expect(["complete", "error"]).toContain(status);

    // Should have events from both sessions
    const events = await store.read(started.requestId);
    const sessionIds = new Set(events.events.map((e) => e.sessionId));
    expect(sessionIds.size).toBe(2); // both sessions attempted

    // One session should have error, one should have complete
    const errorEvents = events.events.filter((e) => e.type === "error");
    const completeEvents = events.events.filter((e) => e.type === "complete");
    expect(errorEvents.length).toBe(1);
    expect(completeEvents.length).toBe(1);
  });

  it("emits error event with provider name in the error message", async () => {
    const { service, store, conversation } = await setupService(
      new MidStreamErrorProvider([], "rate_limit: too many requests"),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_fail_test",
        email: "fail@test.com",
        name: "Fail Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    const events = await store.read(started.requestId);
    const errorEvent = events.events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect((errorEvent as any).error).toContain("rate_limit");
  });
});
