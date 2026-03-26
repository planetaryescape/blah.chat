/**
 * @vitest-environment node
 */
import { createConversationRepository } from "@blah-chat/persistence-postgres";
import type { GenerationEvent } from "@blah-chat/streaming-core";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type { GenerationProvider } from "../types";

class SlowStreamProvider implements GenerationProvider {
  constructor(
    private readonly outputs: Record<string, string[]>,
    private readonly chunkDelayMs = 50,
  ) {}

  async *streamText(input: { modelId: string }) {
    for (const chunk of this.outputs[input.modelId] ?? []) {
      await new Promise((resolve) => setTimeout(resolve, this.chunkDelayMs));
      yield chunk;
    }
  }
}

class FakeProvider implements GenerationProvider {
  constructor(private readonly outputs: Record<string, string[]>) {}

  async *streamText(input: { modelId: string }) {
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
    clerkId: "user_resilience",
    email: "resilience@test.com",
    name: "Resilience Tester",
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: "Test",
    model: "openai:gpt-5-mini",
  });

  return { service, db, store, conversation, user };
}

describe("GenerationV2Service resilience", () => {
  it("streamToSse replays completed events from store", async () => {
    const { service, conversation } = await setupService(
      new FakeProvider({ "openai:gpt-5-mini": ["Hello", " world"] }),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_resilience",
        email: "resilience@test.com",
        name: "Resilience Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    // Process first (complete the generation)
    await service.process(started.requestId);

    // Then stream — should replay all events
    const received: GenerationEvent[] = [];
    const abort = new AbortController();

    await service.streamToSse(
      started.requestId,
      abort.signal,
      async (_event, data) => {
        received.push(data as GenerationEvent);
      },
    );

    // Should have received events including complete
    expect(received.length).toBeGreaterThan(0);
    const completeEvent = received.find((e) => e.type === "complete");
    expect(completeEvent).toBeDefined();
    expect((completeEvent as any).content).toBe("Hello world");
  });

  it("streamToSse does not emit duplicate events on reconnect", async () => {
    const { service, conversation } = await setupService(
      new FakeProvider({ "openai:gpt-5-mini": ["Hello", " world"] }),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_resilience",
        email: "resilience@test.com",
        name: "Resilience Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    // Stream twice (simulating reconnect)
    const firstReceived: GenerationEvent[] = [];
    const secondReceived: GenerationEvent[] = [];

    await service.streamToSse(
      started.requestId,
      new AbortController().signal,
      async (_event, data) => {
        firstReceived.push(data as GenerationEvent);
      },
    );

    await service.streamToSse(
      started.requestId,
      new AbortController().signal,
      async (_event, data) => {
        secondReceived.push(data as GenerationEvent);
      },
    );

    // Both should get the same events (no duplicates within each stream)
    const firstSeqs = firstReceived.map((e) => e.seq);
    const secondSeqs = secondReceived.map((e) => e.seq);

    // No duplicate sequences within a single stream
    expect(new Set(firstSeqs).size).toBe(firstSeqs.length);
    expect(new Set(secondSeqs).size).toBe(secondSeqs.length);
  });

  it("replays canonical DB state when Redis store is empty", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);

    // Use a store that we can clear to simulate Redis emptied
    const liveStore = new MemoryGenerationEventStore();
    const emptyStore = new MemoryGenerationEventStore();

    let time = 1_000;
    const now = () => {
      time += 100;
      return time;
    };

    // Process with live store (normal flow)
    const service = new GenerationV2Service(
      db,
      liveStore,
      new FakeProvider({ "openai:gpt-5-mini": ["Hello", " world"] }),
      async () => {},
      now,
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_replay",
      email: "replay@test.com",
      name: "Replay Tester",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Test",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_replay",
        email: "replay@test.com",
        name: "Replay Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    // Now create a new service with empty store (simulating Redis cleared)
    const replayService = new GenerationV2Service(
      db,
      emptyStore,
      new FakeProvider({}),
      async () => {},
      now,
    );

    // Stream from the empty store — should fall back to DB replay
    const received: GenerationEvent[] = [];
    await replayService.streamToSse(
      started.requestId,
      new AbortController().signal,
      async (_event, data) => {
        received.push(data as GenerationEvent);
      },
    );

    // Should have replayed from canonical DB state
    expect(received.length).toBeGreaterThan(0);
    const completeEvent = received.find((e) => e.type === "complete");
    expect(completeEvent).toBeDefined();
    expect((completeEvent as any).content).toBe("Hello world");
  });

  it("preserves content through checkpoint after cancellation", async () => {
    const { service, conversation } = await setupService(
      new SlowStreamProvider(
        { "openai:gpt-5-mini": ["Hello", " world", " foo", " bar"] },
        100,
      ),
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_resilience",
        email: "resilience@test.com",
        name: "Resilience Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    // Start processing but stop after a short delay
    const processPromise = service.process(started.requestId);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await service.stop(started.requestId);
    await processPromise;

    // Stream after cancellation — should get partial content via checkpoint
    const received: GenerationEvent[] = [];
    await service.streamToSse(
      started.requestId,
      new AbortController().signal,
      async (_event, data) => {
        received.push(data as GenerationEvent);
      },
    );

    // Should have checkpoint or cancelled events with partial content
    const checkpointEvents = received.filter(
      (e) => e.type === "checkpoint" || e.type === "cancelled",
    );
    expect(checkpointEvents.length).toBeGreaterThan(0);
  });
});
