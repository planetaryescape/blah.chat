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
 * Provider that yields some chunks, then hangs forever (never resolves,
 * never throws) — simulating a stalled upstream stream.
 */
class StallingProvider implements GenerationProvider {
  signal: AbortSignal | undefined;

  constructor(private readonly chunksBeforeStall: string[]) {}

  streamText(input: { signal?: AbortSignal }): AsyncIterable<string> {
    this.signal = input.signal;
    const chunks = [...this.chunksBeforeStall];
    return {
      [Symbol.asyncIterator]: () => ({
        next: async (): Promise<IteratorResult<string>> => {
          const chunk = chunks.shift();
          if (chunk !== undefined) {
            return { done: false, value: chunk };
          }
          return new Promise<IteratorResult<string>>(() => {});
        },
      }),
    };
  }
}

class CompletingProvider implements GenerationProvider {
  constructor(private readonly chunks: string[]) {}

  async *streamText() {
    for (const chunk of this.chunks) {
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
    clerkId: "user_stall_test",
    email: "stall@test.com",
    name: "Stall Tester",
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: "Test",
    model: "openai:gpt-5-mini",
  });

  return { service, db, store, conversation, user };
}

async function startGeneration(
  service: GenerationV2Service,
  conversationId: string,
) {
  return service.start({
    clerkUser: {
      clerkId: "user_stall_test",
      email: "stall@test.com",
      name: "Stall Tester",
    },
    conversationId,
    content: "Say hi",
    modelId: "openai:gpt-5-mini",
  });
}

describe("GenerationV2Service stall watchdog", () => {
  it("aborts the provider and records error when the stream stalls", async () => {
    const provider = new StallingProvider(["Hello", " wor"]);
    const { service, db, store, conversation } = await setupService(provider);

    const started = await startGeneration(service, conversation.id);
    const status = await service.process(started.requestId);

    expect(status).toBe("error");

    const events = await store.read(started.requestId);
    const errorEvent = events.events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect((errorEvent as any).error).toContain("Generation stalled");

    expect(provider.signal?.aborted).toBe(true);

    const outcomes = await db.select().from(routingOutcomes);
    expect(outcomes.length).toBe(1);
    expect(outcomes[0].status).toBe("error");
  });

  it("preserves accumulated content in the assistant message on stall", async () => {
    const provider = new StallingProvider(["Hello", " wor"]);
    const { service, conversation } = await setupService(provider);

    const started = await startGeneration(service, conversation.id);
    await service.process(started.requestId);

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

  it("does not stall a stream that keeps yielding and completes", async () => {
    const { service, store, conversation } = await setupService(
      new CompletingProvider(["Hello", " world"]),
    );

    const started = await startGeneration(service, conversation.id);
    const status = await service.process(started.requestId);

    expect(status).toBe("complete");

    const events = await store.read(started.requestId);
    expect(events.events.some((e) => e.type === "error")).toBe(false);
    const completeEvent = events.events.find((e) => e.type === "complete");
    expect((completeEvent as any).content).toBe("Hello world");
  });
});
