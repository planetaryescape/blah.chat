/**
 * @vitest-environment node
 */
import { createConversationRepository } from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { MetricsCollector } from "../../observability/metrics";
import type { MetricsCollectorDependencies } from "../../observability/types";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type { GenerationProvider } from "../types";

class FakeProvider implements GenerationProvider {
  constructor(private readonly outputs: Record<string, string[]>) {}

  async *streamText(input: { modelId: string }) {
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }
}

class SlowProvider implements GenerationProvider {
  constructor(
    private readonly outputs: Record<string, string[]>,
    private readonly delayMs: number,
  ) {}

  async *streamText(input: { modelId: string }) {
    const chunks = this.outputs[input.modelId] ?? [];
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
      yield chunks[i];
    }
  }

  async getUsage() {
    return { inputTokens: 50, outputTokens: 100, totalTokens: 150 };
  }
}

class ErrorProvider implements GenerationProvider {
  constructor(private readonly chunksBeforeError: string[] = []) {}

  async *streamText() {
    for (const chunk of this.chunksBeforeError) {
      yield chunk;
    }
    throw new Error("Provider exploded");
  }
}

function createSpyDeps() {
  const calls: Record<string, unknown[]> = {
    recordTTFT: [],
    recordTokenRate: [],
    recordCheckpointLatency: [],
    recordStopLatency: [],
    recordRouterLatency: [],
    recordProviderError: [],
    flush: [],
  };

  return { calls };
}

function createSpyCollector(spyDeps: ReturnType<typeof createSpyDeps>) {
  const deps: MetricsCollectorDependencies = {
    logger: { info: () => {} },
  };
  const collector = new MetricsCollector(deps);

  const originalRecordTTFT = collector.recordTTFT.bind(collector);
  collector.recordTTFT = (ms: number) => {
    spyDeps.calls.recordTTFT.push(ms);
    return originalRecordTTFT(ms);
  };

  const originalRecordTokenRate = collector.recordTokenRate.bind(collector);
  collector.recordTokenRate = (tokens: number, durationMs: number) => {
    spyDeps.calls.recordTokenRate.push({ tokens, durationMs });
    return originalRecordTokenRate(tokens, durationMs);
  };

  const originalRecordCheckpointLatency =
    collector.recordCheckpointLatency.bind(collector);
  collector.recordCheckpointLatency = (ms: number) => {
    spyDeps.calls.recordCheckpointLatency.push(ms);
    return originalRecordCheckpointLatency(ms);
  };

  const originalRecordRouterLatency =
    collector.recordRouterLatency.bind(collector);
  collector.recordRouterLatency = (ms: number) => {
    spyDeps.calls.recordRouterLatency.push(ms);
    return originalRecordRouterLatency(ms);
  };

  const originalRecordProviderError =
    collector.recordProviderError.bind(collector);
  collector.recordProviderError = (
    provider: string,
    error: string,
    classification: string,
  ) => {
    spyDeps.calls.recordProviderError.push({ provider, error, classification });
    return originalRecordProviderError(provider, error, classification);
  };

  const originalFlush = collector.flush.bind(collector);
  collector.flush = async (distinctId: string) => {
    spyDeps.calls.flush.push(distinctId);
    return originalFlush(distinctId);
  };

  return collector;
}

async function setupTestService(
  provider: GenerationProvider,
  spyDeps: ReturnType<typeof createSpyDeps>,
) {
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
    {},
    () => createSpyCollector(spyDeps),
  );

  const user = await (service as any).repository.upsertUser({
    clerkId: "user_metrics_test",
    email: "metrics@test.com",
    name: "Metrics Tester",
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: "Test",
    model: "openai:gpt-5-mini",
  });

  return { service, db, store, conversation, user };
}

describe("GenerationV2Service metrics instrumentation", () => {
  it("records TTFT on successful generation", async () => {
    const spyDeps = createSpyDeps();
    const { service, conversation } = await setupTestService(
      new FakeProvider({ "openai:gpt-5-mini": ["Hello", " world"] }),
      spyDeps,
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_metrics_test",
        email: "metrics@test.com",
        name: "Metrics Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    expect(spyDeps.calls.recordTTFT.length).toBe(1);
    expect(spyDeps.calls.recordTTFT[0]).toBeGreaterThan(0);
  });

  it("records token rate at completion when usage is available", async () => {
    const spyDeps = createSpyDeps();
    const { service, conversation } = await setupTestService(
      new SlowProvider({ "openai:gpt-5-mini": ["Hello", " world"] }, 10),
      spyDeps,
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_metrics_test",
        email: "metrics@test.com",
        name: "Metrics Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    expect(spyDeps.calls.recordTokenRate.length).toBe(1);
    const tokenRateCall = spyDeps.calls.recordTokenRate[0] as {
      tokens: number;
      durationMs: number;
    };
    expect(tokenRateCall.tokens).toBe(100); // outputTokens from SlowProvider.getUsage
    expect(tokenRateCall.durationMs).toBeGreaterThan(0);
  });

  it("records router latency for auto-routed requests", async () => {
    const spyDeps = createSpyDeps();
    const { service, conversation } = await setupTestService(
      new FakeProvider({ "openai:gpt-5-mini": ["Hello"] }),
      spyDeps,
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_metrics_test",
        email: "metrics@test.com",
        name: "Metrics Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    // Router latency is always recorded (even for explicit models, it's the route resolution time)
    expect(spyDeps.calls.recordRouterLatency.length).toBe(1);
    expect(spyDeps.calls.recordRouterLatency[0]).toBeGreaterThanOrEqual(0);
  });

  it("records provider error on failure", async () => {
    const spyDeps = createSpyDeps();
    const { service, conversation } = await setupTestService(
      new ErrorProvider(["partial"]),
      spyDeps,
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_metrics_test",
        email: "metrics@test.com",
        name: "Metrics Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    expect(spyDeps.calls.recordProviderError.length).toBe(1);
    const errorCall = spyDeps.calls.recordProviderError[0] as {
      provider: string;
      error: string;
    };
    expect(errorCall.provider).toBe("openai");
    expect(errorCall.error).toContain("Provider exploded");
  });

  it("flushes metrics once at end of process()", async () => {
    const spyDeps = createSpyDeps();
    const { service, conversation } = await setupTestService(
      new FakeProvider({ "openai:gpt-5-mini": ["Hello", " world"] }),
      spyDeps,
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_metrics_test",
        email: "metrics@test.com",
        name: "Metrics Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    expect(spyDeps.calls.flush.length).toBe(1);
  });

  it("flushes metrics even when generation errors", async () => {
    const spyDeps = createSpyDeps();
    const { service, conversation } = await setupTestService(
      new ErrorProvider(),
      spyDeps,
    );

    const started = await service.start({
      clerkUser: {
        clerkId: "user_metrics_test",
        email: "metrics@test.com",
        name: "Metrics Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    expect(spyDeps.calls.flush.length).toBe(1);
  });
});
