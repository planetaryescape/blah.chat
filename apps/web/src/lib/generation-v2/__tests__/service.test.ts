/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createPreferenceRepository,
  messageSources,
  messageToolCalls,
  providerHealthSnapshots,
  routingCandidateScores,
  routingDecisions,
  routingOutcomes,
  routingPolicies,
  sourceMetadata,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type { GenerationProvider, GenerationToolCall } from "../types";

class FakeGenerationProvider implements GenerationProvider {
  constructor(private readonly outputs: Record<string, string[]>) {}

  async *streamText(input: { modelId: string }) {
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }
}

class InspectableGenerationProvider implements GenerationProvider {
  calls: Array<{
    modelId: string;
    messages: Array<{ role: string; content: string }>;
  }> = [];

  constructor(private readonly outputs: Record<string, string[]>) {}

  async *streamText(input: {
    modelId: string;
    messages: Array<{ role: string; content: string }>;
  }) {
    this.calls.push({
      modelId: input.modelId,
      messages: input.messages,
    });

    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }
}

class SourceAwareGenerationProvider implements GenerationProvider {
  constructor(
    private readonly outputs: Record<string, string[]>,
    private readonly sources: Record<
      string,
      Array<{ title: string; url: string }>
    >,
  ) {}

  async *streamText(input: { modelId: string }) {
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }

  async getSources(input: { sessionId: string }) {
    return (this.sources[input.sessionId] ?? []).map((source, index) => ({
      position: index + 1,
      title: source.title,
      url: source.url,
    }));
  }
}

class ToolCallAwareGenerationProvider implements GenerationProvider {
  constructor(
    private readonly outputs: Record<string, string[]>,
    private readonly toolCalls: Record<string, GenerationToolCall[]>,
  ) {}

  async *streamText(input: { modelId: string }) {
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }

  async getToolCalls(input: { sessionId: string }) {
    return this.toolCalls[input.sessionId] ?? [];
  }
}

class StoppableGenerationProvider implements GenerationProvider {
  async *streamText() {
    yield "hello ";
    await new Promise((resolve) => setTimeout(resolve, 300));
    yield "world";
  }
}

class ComparisonStopProvider implements GenerationProvider {
  async *streamText(input: { modelId: string }) {
    yield `${input.modelId}-a`;
    await new Promise((resolve) => setTimeout(resolve, 300));
    yield `${input.modelId}-b`;
  }
}

describe("GenerationV2Service", () => {
  it("streams a single-model request, checkpoints it, and completes it", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5-mini": ["Hello", " world"],
      }),
      async () => {},
      (() => {
        let time = 1_000;
        return () => {
          time += 300;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_123",
      email: "user@example.com",
      name: "User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Test",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_123",
        email: "user@example.com",
        name: "User",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const status = await service.process(started.requestId);
    const messages = await (service as any).repository.listMessages(
      conversation.id,
    );
    const checkpoints = await (service as any).repository.listCheckpoints(
      (await (service as any).repository.getRequestBundle(started.requestId))!
        .sessions[0]!.sessionId,
    );
    const events = await store.read(started.requestId);

    expect(status).toBe("complete");
    expect(
      messages.map(
        (message: { role: string; content: string; status: string }) => ({
          role: message.role,
          content: message.content,
          status: message.status,
        }),
      ),
    ).toEqual([
      { role: "user", content: "Say hi", status: "complete" },
      { role: "assistant", content: "Hello world", status: "complete" },
    ]);
    expect(checkpoints.length).toBeGreaterThanOrEqual(1);
    expect(events.events.map((event) => event.type)).toContain("complete");
  });

  it("queues auto-title after completing a default-title conversation", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const autoTitleConversation = vi.fn(async (_conversationId: string) => {});
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5-mini": ["Hello", " world"],
      }),
      async () => {},
      (() => {
        let time = 2_000;
        return () => {
          time += 300;
          return time;
        };
      })(),
      {
        autoTitleConversation,
      },
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_title_123",
      email: "user-title@example.com",
      name: "User Title",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "New Chat",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_title_123",
        email: "user-title@example.com",
        name: "User Title",
      },
      conversationId: conversation.id,
      content: "Title this conversation",
      modelId: "openai:gpt-5-mini",
    });

    const status = await service.process(started.requestId);

    expect(status).toBe("complete");
    expect(autoTitleConversation).toHaveBeenCalledWith(conversation.id);
  });

  it("persists assistant sources and enqueues metadata enrichment on completion", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const enrichSourceMetadata = vi.fn(async () => {});
    const service = new GenerationV2Service(
      db,
      store,
      new SourceAwareGenerationProvider(
        {
          "perplexity:sonar": ["Researched answer"],
        },
        {},
      ),
      async () => {},
      (() => {
        let time = 5_000;
        return () => {
          time += 250;
          return time;
        };
      })(),
      {
        enrichSourceMetadata,
      },
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_sources",
      email: "sources@example.com",
      name: "Source User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Source test",
      model: "perplexity:sonar",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_sources",
        email: "sources@example.com",
        name: "Source User",
      },
      conversationId: conversation.id,
      content: "What changed in the rewrite?",
      modelId: "perplexity:sonar",
    });

    const bundle = await (service as any).repository.getRequestBundle(
      started.requestId,
    );
    const sessionId = bundle.sessions[0]!.sessionId;
    (service as any).provider = new SourceAwareGenerationProvider(
      {
        "perplexity:sonar": ["Researched answer"],
      },
      {
        [sessionId]: [
          {
            title: "Postgres Rewrite Notes",
            url: "https://example.com/rewrite",
          },
        ],
      },
    );

    const status = await service.process(started.requestId);

    expect(status).toBe("complete");
    const storedSources = await db.query.messageSources.findMany({
      where: eq(messageSources.messageId, started.assistantMessageIds[0]!),
    });
    const storedMetadata = await db.query.sourceMetadata.findFirst({
      where: eq(sourceMetadata.urlHash, storedSources[0]!.urlHash),
    });

    expect(storedSources).toHaveLength(1);
    expect(storedSources[0]).toMatchObject({
      provider: "perplexity",
      title: "Postgres Rewrite Notes",
      url: "https://example.com/rewrite",
    });
    expect(storedMetadata).toMatchObject({
      title: "Postgres Rewrite Notes",
      enriched: false,
    });
    expect(enrichSourceMetadata).toHaveBeenCalledWith({
      messageId: started.assistantMessageIds[0],
      sourceUrls: ["https://example.com/rewrite"],
    });
  });

  it("persists assistant tool calls on completion", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const toolCallsBySession: Record<string, GenerationToolCall[]> = {};
    const service = new GenerationV2Service(
      db,
      store,
      new ToolCallAwareGenerationProvider(
        {
          "openai:gpt-5-mini": ["Tool-backed answer"],
        },
        toolCallsBySession,
      ),
      async () => {},
      (() => {
        let time = 7_500;
        return () => {
          time += 250;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_tools",
      email: "tools@example.com",
      name: "Tool User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Tool test",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_tools",
        email: "tools@example.com",
        name: "Tool User",
      },
      conversationId: conversation.id,
      content: "Use tools",
      modelId: "openai:gpt-5-mini",
    });

    const bundle = await (service as any).repository.getRequestBundle(
      started.requestId,
    );
    const sessionId = bundle?.sessions[0]?.sessionId;
    const assistantMessageId = bundle?.sessions[0]?.assistantMessageId;

    expect(sessionId).toBeTruthy();
    expect(assistantMessageId).toBeTruthy();

    toolCallsBySession[sessionId!] = [
      {
        toolCallId: "call_search_1",
        toolName: "webSearch",
        args: { query: "postgres rewrite" },
        result: { success: true, hits: 3 },
        timestamp: 7_800,
      },
    ];

    const status = await service.process(started.requestId);

    expect(status).toBe("complete");
    const persistedToolCalls = await db.query.messageToolCalls.findMany({
      where: eq(messageToolCalls.messageId, assistantMessageId!),
    });

    expect(persistedToolCalls).toHaveLength(1);
    expect(persistedToolCalls[0]).toMatchObject({
      messageId: assistantMessageId,
      conversationId: conversation.id,
      userId: user.id,
      toolCallId: "call_search_1",
      toolName: "webSearch",
      args: { query: "postgres rewrite" },
      result: { success: true, hits: 3 },
      isPartial: false,
      timestamp: 7_800,
    });
  });

  it("queues model-fit analysis after completing an explicit expensive-model request", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const analyzeModelFit = vi.fn(
      async (_input: {
        conversationId: string;
        userMessage: string;
        currentModelId: string;
        wasAutoSelected: boolean;
      }) => {},
    );
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5": ["Short", " answer"],
      }),
      async () => {},
      (() => {
        let time = 2_500;
        return () => {
          time += 300;
          return time;
        };
      })(),
      {
        analyzeModelFit,
      },
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_model_triage_service",
      email: "triage-service@example.com",
      name: "Triage Service",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Expensive",
      model: "openai:gpt-5",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_model_triage_service",
        email: "triage-service@example.com",
        name: "Triage Service",
      },
      conversationId: conversation.id,
      content: "Summarize these notes quickly.",
      modelId: "openai:gpt-5",
    });

    const status = await service.process(started.requestId);

    expect(status).toBe("complete");
    expect(analyzeModelFit).toHaveBeenCalledWith({
      conversationId: conversation.id,
      userMessage: "Summarize these notes quickly.",
      currentModelId: "openai:gpt-5",
      wasAutoSelected: false,
    });
  });

  it("records a routing decision and terminal routing outcome for each generated session", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5-mini": ["Hello", " world"],
      }),
      async () => {},
      (() => {
        let time = 2_000;
        return () => {
          time += 200;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_routing",
      email: "routing@example.com",
      name: "Routing User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Routing",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_routing",
        email: "routing@example.com",
        name: "Routing User",
      },
      conversationId: conversation.id,
      content: "Log this route",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    const decisions = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.generationRequestId, started.requestId));
    const outcomes = await db
      .select()
      .from(routingOutcomes)
      .where(eq(routingOutcomes.generationRequestId, started.requestId));

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      generationRequestId: started.requestId,
      conversationId: conversation.id,
      userId: user.id,
      selectedModelId: "openai:gpt-5-mini",
    });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      generationRequestId: started.requestId,
      status: "complete",
    });
    expect(outcomes[0]?.decisionId).toBe(decisions[0]?.id);
    expect(outcomes[0]?.ttftMs).toBeGreaterThan(0);
    expect(outcomes[0]?.latencyMs).toBeGreaterThanOrEqual(
      outcomes[0]?.ttftMs ?? 0,
    );
  });

  it("routes auto requests to a concrete model and persists the selected route", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    // Provide output for all code_heavy candidates since exploration may pick any
    const codeOutput = ["typed ", "output"];
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5.1-codex": codeOutput,
        "anthropic:claude-sonnet-4": codeOutput,
        "deepseek:deepseek-r1": codeOutput,
        "openai:gpt-5.1": codeOutput,
        "google:gemini-2.5-pro": codeOutput,
      }),
      async () => {},
      (() => {
        let time = 3_000;
        return () => {
          time += 150;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_auto",
      email: "auto@example.com",
      name: "Auto User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Auto route",
      model: "auto",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_auto",
        email: "auto@example.com",
        name: "Auto User",
      },
      conversationId: conversation.id,
      content: "```ts\nconst sum = (a: number, b: number) => a + b;\n```",
      modelId: "auto",
    });

    await service.process(started.requestId);

    const decisions = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.generationRequestId, started.requestId));
    const msgs = await (service as any).repository.listMessages(
      conversation.id,
    );

    // Hard rule should fire code_heavy; exact model depends on scoring + exploration
    expect(decisions[0]).toMatchObject({
      routeLabel: "code_heavy",
    });
    expect(msgs[1]).toMatchObject({
      role: "assistant",
      content: "typed output",
      status: "complete",
    });
    // Model should be one of the code_heavy candidates
    expect([
      "openai:gpt-5.1-codex",
      "anthropic:claude-sonnet-4",
      "deepseek:deepseek-r1",
      "openai:gpt-5.1",
      "google:gemini-2.5-pro",
    ]).toContain(decisions[0]?.selectedModelId);
  });

  it("uses the persisted default model when auto router is disabled", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const preferences = createPreferenceRepository(db);
    const service = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({
        "google:gemini-2.0-flash": ["manual fallback"],
      }),
      async () => {},
      (() => {
        let time = 4_000;
        return () => {
          time += 150;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_auto_disabled",
      email: "auto-disabled@example.com",
      name: "Auto Disabled",
    });
    await preferences.setForUser(user.id, "autoRouterEnabled", false);
    await preferences.setForUser(
      user.id,
      "defaultModel",
      "google:gemini-2.0-flash",
    );
    const conversation = await conversations.create({
      userId: user.id,
      title: "Auto disabled",
      model: "auto",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_auto_disabled",
        email: "auto-disabled@example.com",
        name: "Auto Disabled",
      },
      conversationId: conversation.id,
      content: "Use my saved preference",
      modelId: "auto",
    });

    await service.process(started.requestId);

    const decisions = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.generationRequestId, started.requestId));
    const messages = await (service as any).repository.listMessages(
      conversation.id,
    );

    expect(decisions[0]).toMatchObject({
      routeLabel: "manual_default",
      selectedModelId: "google:gemini-2.0-flash",
    });
    expect(messages[1]).toMatchObject({
      role: "assistant",
      model: "google:gemini-2.0-flash",
      content: "manual fallback",
      status: "complete",
    });
  });

  it("keeps the previous successful model for the same auto-router route", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const service = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({
        "deepseek:deepseek-r1": ["sticky route"],
        "openai:gpt-5.1-codex": ["fallback route"],
      }),
      async () => {},
      (() => {
        let time = 5_000;
        return () => {
          time += 150;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_sticky",
      email: "sticky@example.com",
      name: "Sticky User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Sticky route",
      model: "auto",
    });

    const firstStarted = await service.start({
      clerkUser: {
        clerkId: "user_sticky",
        email: "sticky@example.com",
        name: "Sticky User",
      },
      conversationId: conversation.id,
      content:
        "```ts\nexport const add = (a: number, b: number) => a + b;\n```",
      modelId: "deepseek:deepseek-r1",
    });

    await service.process(firstStarted.requestId);
    await db.insert(routingDecisions).values({
      generationRequestId: firstStarted.requestId,
      conversationId: conversation.id,
      userId: user.id,
      routeLabel: "code_heavy",
      selectedModelId: "deepseek:deepseek-r1",
      reasoning: "seed sticky route",
      input: { source: "test_seed" },
      createdAt: 9_500,
    });
    await db.insert(routingPolicies).values({
      name: "test_sticky_route_no_exploration",
      description: "Disable exploration for deterministic sticky assertions",
      isActive: true,
      strategy: "outcome_weighted",
      config: {
        weights: {
          explorationRate: 0,
        },
      },
      createdAt: 9_600,
      updatedAt: 9_600,
    });

    const secondStarted = await service.start({
      clerkUser: {
        clerkId: "user_sticky",
        email: "sticky@example.com",
        name: "Sticky User",
      },
      conversationId: conversation.id,
      content:
        "```ts\nexport function multiply(a: number, b: number) { return a * b; }\n```",
      modelId: "auto",
    });

    await service.process(secondStarted.requestId);

    const decisions = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.generationRequestId, secondStarted.requestId));

    expect(decisions[0]).toMatchObject({
      routeLabel: "code_heavy",
      selectedModelId: "deepseek:deepseek-r1",
    });
    expect(decisions[0]?.input).toMatchObject({
      isSticky: true,
    });
  });

  it("logs policy-linked candidate scores for auto-routed requests", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const service = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({
        "openai:gpt-5.1-codex": ["policy scored"],
      }),
      async () => {},
      (() => {
        let time = 6_000;
        return () => {
          time += 150;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_policy",
      email: "policy@example.com",
      name: "Policy User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Policy route",
      model: "auto",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_policy",
        email: "policy@example.com",
        name: "Policy User",
      },
      conversationId: conversation.id,
      content: String.raw` \`\`\`ts
export const greet = (name: string) => \`hi \${name}\`;
\`\`\` `.trim(),
      modelId: "auto",
    });

    await service.process(started.requestId);

    const decisions = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.generationRequestId, started.requestId));
    const decision = decisions[0];
    const candidateScores = await db
      .select()
      .from(routingCandidateScores)
      .where(eq(routingCandidateScores.decisionId, decision!.id));
    const policies = await db
      .select()
      .from(routingPolicies)
      .where(eq(routingPolicies.id, decision!.policyId!));

    expect(decision?.policyId).toBeTruthy();
    expect(policies[0]).toMatchObject({
      isActive: true,
      strategy: "outcome_weighted",
    });
    expect(candidateScores.length).toBeGreaterThan(1);
    expect(
      candidateScores.find((candidate) => candidate.rank === 1),
    ).toMatchObject({
      decisionId: decision?.id,
      rank: 1,
    });
    expect(
      candidateScores.find(
        (candidate) => candidate.modelId === decision?.selectedModelId,
      ),
    ).toMatchObject({
      decisionId: decision?.id,
      modelId: decision?.selectedModelId,
    });
  });

  it("prefers healthy high-success candidates when policy scoring reranks auto routes", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const service = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({
        "anthropic:claude-sonnet-4": ["healthy winner"],
        "openai:gpt-5.1-codex": ["should not win"],
      }),
      async () => {},
      (() => {
        let time = 7_000;
        return () => {
          time += 150;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_outcomes",
      email: "outcomes@example.com",
      name: "Outcome User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Outcome route",
      model: "auto",
    });

    const [historicalDecision] = await db
      .insert(routingDecisions)
      .values({
        conversationId: conversation.id,
        userId: user.id,
        routeLabel: "code_heavy",
        selectedModelId: "anthropic:claude-sonnet-4",
        reasoning: "historical success",
        input: { source: "seed" },
        createdAt: 6_000,
      })
      .returning();

    await db.insert(routingOutcomes).values([
      {
        decisionId: historicalDecision!.id,
        status: "complete",
        ttftMs: 120,
        latencyMs: 800,
        costUsd: 0.2,
        createdAt: 6_100,
      },
      {
        decisionId: historicalDecision!.id,
        status: "complete",
        ttftMs: 140,
        latencyMs: 900,
        costUsd: 0.22,
        createdAt: 6_200,
      },
    ]);

    await db.insert(providerHealthSnapshots).values({
      provider: "openai",
      modelId: "openai:gpt-5.1-codex",
      status: "down",
      capturedAt: 6_250,
    });

    await db.insert(routingPolicies).values({
      name: "test_outcome_weighted_no_exploration",
      description: "Disable exploration for deterministic reranking assertions",
      isActive: true,
      strategy: "outcome_weighted",
      config: {
        weights: {
          explorationRate: 0,
        },
      },
      createdAt: 6_255,
      updatedAt: 6_255,
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_outcomes",
        email: "outcomes@example.com",
        name: "Outcome User",
      },
      conversationId: conversation.id,
      content: "```ts\nexport const square = (n: number) => n * n;\n```",
      modelId: "auto",
    });

    await service.process(started.requestId);

    const [decision] = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.generationRequestId, started.requestId));
    const candidateScores = await db
      .select()
      .from(routingCandidateScores)
      .where(eq(routingCandidateScores.decisionId, decision!.id));

    expect(decision).toMatchObject({
      routeLabel: "code_heavy",
      selectedModelId: "anthropic:claude-sonnet-4",
    });
    expect(
      candidateScores.find((candidate) => candidate.rank === 1),
    ).toMatchObject({
      modelId: "anthropic:claude-sonnet-4",
      rank: 1,
    });
    expect(
      candidateScores.find(
        (candidate) => candidate.modelId === "openai:gpt-5.1-codex",
      )?.features,
    ).toMatchObject({
      healthStatus: "down",
    });
  });

  it("stops a running request and emits a cancelled event", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new StoppableGenerationProvider(),
      async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_stop",
      email: "stop@example.com",
      name: "Stop User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Stop test",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_stop",
        email: "stop@example.com",
        name: "Stop User",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const processing = service.process(started.requestId);
    await service.stop(started.requestId);
    await processing;

    const status = await store.getRequestStatus(started.requestId);
    const events = await store.read(started.requestId);

    expect(status).toBe("cancelled");
    expect(events.events.at(-1)?.type).toBe("cancelled");
  });

  it("replays the latest Postgres checkpoint when the live event log is unavailable", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const writeStore = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      writeStore,
      new FakeGenerationProvider({
        "openai:gpt-5-mini": ["Hello", " world"],
      }),
      async () => {},
      (() => {
        let time = 8_000;
        return () => {
          time += 250;
          return time;
        };
      })(),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_resume_checkpoint",
      email: "resume-checkpoint@example.com",
      name: "Resume Checkpoint User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Resume checkpoint",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_resume_checkpoint",
        email: "resume-checkpoint@example.com",
        name: "Resume Checkpoint User",
      },
      conversationId: conversation.id,
      content: "Resume me",
      modelId: "openai:gpt-5-mini",
    });

    const bundle = await service.repository.getRequestBundle(started.requestId);
    const session = bundle?.sessions[0];
    expect(session).toBeTruthy();

    await service.repository.updateRequestStatus(started.requestId, "running");
    await service.repository.updateSessionStatus(session!.sessionId, "running");
    await service.repository.updateAssistantMessage({
      assistantMessageId: session!.assistantMessageId,
      content: "partial checkpoint",
      status: "streaming",
    });
    await service.repository.insertCheckpoint({
      requestId: started.requestId,
      sessionId: session!.sessionId,
      content: "partial checkpoint",
      sequence: 7,
    });

    const replayService = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({}),
      async () => {},
      () => 9_999,
    );
    const sent: Array<{ event: string; data: unknown }> = [];
    const abortController = new AbortController();

    await replayService.streamToSse(
      started.requestId,
      abortController.signal,
      async (event, data) => {
        sent.push({ event, data });
        abortController.abort();
      },
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({
      event: "generation",
      data: expect.objectContaining({
        type: "checkpoint",
        requestId: started.requestId,
        sessionId: session!.sessionId,
        assistantMessageId: session!.assistantMessageId,
        modelId: "openai:gpt-5-mini",
        content: "partial checkpoint",
      }),
    });
  });

  it("persists cancelling intent before a stopped request finishes", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const service = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({}),
      async () => {},
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_durable_stop",
      email: "durable-stop@example.com",
      name: "Durable Stop User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Durable stop",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_durable_stop",
        email: "durable-stop@example.com",
        name: "Durable Stop User",
      },
      conversationId: conversation.id,
      content: "Stop me",
      modelId: "openai:gpt-5-mini",
    });

    await service.stop(started.requestId);

    const replay = await service.repository.getRequestStreamReplay(
      started.requestId,
    );

    expect(replay?.requestStatus).toBe("cancelling");
    expect(replay?.sessions.map((session) => session.status)).toEqual([
      "cancelling",
    ]);
  });

  it("preserves partial assistant content and checkpoints when a request is stopped", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new StoppableGenerationProvider(),
      async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_stop_partial",
      email: "stop-partial@example.com",
      name: "Stop Partial User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Stop partial",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_stop_partial",
        email: "stop-partial@example.com",
        name: "Stop Partial User",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const bundle = await service.repository.getRequestBundle(started.requestId);
    const session = bundle?.sessions[0];
    expect(session).toBeTruthy();

    const processing = service.process(started.requestId);
    await service.stop(started.requestId);
    await processing;

    const assistants = await service.repository.getAssistantMessagesForRequest(
      started.requestId,
    );
    const checkpoints = await service.repository.listCheckpoints(
      session!.sessionId,
    );

    expect(assistants[0]).toMatchObject({
      id: session!.assistantMessageId,
      status: "cancelled",
      content: "hello ",
    });
    expect(checkpoints.at(-1)).toMatchObject({
      sessionId: session!.sessionId,
      content: "hello ",
    });
  });

  it("replays stopped partial content from canonical state after reconnect", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new StoppableGenerationProvider(),
      async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_stop_replay",
      email: "stop-replay@example.com",
      name: "Stop Replay User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Stop replay",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_stop_replay",
        email: "stop-replay@example.com",
        name: "Stop Replay User",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const processing = service.process(started.requestId);
    await service.stop(started.requestId);
    await processing;

    const replayService = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({}),
      async () => {},
      () => 9_999,
    );
    const sent: Array<{ event: string; data: unknown }> = [];
    const abortController = new AbortController();

    await replayService.streamToSse(
      started.requestId,
      abortController.signal,
      async (event, data) => {
        sent.push({ event, data });
        if (
          typeof data === "object" &&
          data &&
          "type" in data &&
          data.type === "cancelled"
        ) {
          abortController.abort();
        }
      },
    );

    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual({
      event: "generation",
      data: expect.objectContaining({
        type: "checkpoint",
        requestId: started.requestId,
        content: "hello ",
      }),
    });
    expect(sent[1]).toEqual({
      event: "generation",
      data: expect.objectContaining({
        type: "cancelled",
        requestId: started.requestId,
      }),
    });
  });

  it("reaches terminal cancelled state via canonical fallback when Redis stays unavailable", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const service = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new StoppableGenerationProvider(),
      async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_stop_terminal_replay",
      email: "stop-terminal-replay@example.com",
      name: "Stop Terminal Replay User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Stop terminal replay",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_stop_terminal_replay",
        email: "stop-terminal-replay@example.com",
        name: "Stop Terminal Replay User",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const replayService = new GenerationV2Service(
      db,
      new MemoryGenerationEventStore(),
      new FakeGenerationProvider({}),
      async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      () => 9_999,
    );
    const sent: Array<{ event: string; data: unknown }> = [];
    const abortController = new AbortController();

    const processing = service.process(started.requestId);
    await service.stop(started.requestId);

    const streamPromise = replayService.streamToSse(
      started.requestId,
      abortController.signal,
      async (event, data) => {
        sent.push({ event, data });
        if (
          typeof data === "object" &&
          data &&
          "type" in data &&
          data.type === "cancelled"
        ) {
          abortController.abort();
        }
      },
    );

    await processing;

    const completion = await Promise.race([
      streamPromise.then(() => "done"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 1200)),
    ]);

    expect(completion).toBe("done");
    expect(
      sent.some((entry) => {
        return (
          typeof entry.data === "object" &&
          entry.data !== null &&
          "type" in entry.data &&
          entry.data.type === "cancelled"
        );
      }),
    ).toBe(true);
  });

  it("creates sibling assistant sessions for comparison mode and completes all of them", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5-mini": ["fast"],
        "anthropic:claude-sonnet-4": ["careful"],
      }),
      async () => {},
      (() => {
        let time = 1_000;
        return () => {
          time += 300;
          return time;
        };
      })(),
    );

    const user = await (service as any).repository.upsertUser({
      clerkId: "user_compare",
      email: "compare@example.com",
      name: "Compare User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Compare",
      model: "auto",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_compare",
        email: "compare@example.com",
        name: "Compare User",
      },
      conversationId: conversation.id,
      content: "Compare this",
      models: ["openai:gpt-5-mini", "anthropic:claude-sonnet-4"],
    });

    const status = await service.process(started.requestId);
    const assistants = await (
      service as any
    ).repository.getAssistantMessagesForRequest(started.requestId);
    const messages = await service.repository.listMessages(conversation.id);
    const events = await store.read(started.requestId);

    expect(status).toBe("complete");
    expect(assistants).toHaveLength(2);
    expect(
      assistants.map((message: { model: string | null; content: string }) => ({
        model: message.model,
        content: message.content,
      })),
    ).toEqual([
      { model: "openai:gpt-5-mini", content: "fast" },
      { model: "anthropic:claude-sonnet-4", content: "careful" },
    ]);
    expect(
      events.events.filter((event) => event.type === "complete"),
    ).toHaveLength(2);
    expect(
      messages.find((message: { role: string }) => message.role === "user")
        ?.comparisonGroupId,
    ).toBeTruthy();
  });

  it("creates an in-chat consolidation request, hides originals, and streams with a consolidation prompt override", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const provider = new InspectableGenerationProvider({
      "openai:gpt-5-mini": ["first"],
      "anthropic:claude-sonnet-4": ["second"],
      "openai:gpt-5": ["merged answer"],
    });
    const service = new GenerationV2Service(
      db,
      store,
      provider,
      async () => {},
      (() => {
        let time = 4_000;
        return () => {
          time += 300;
          return time;
        };
      })(),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_merge",
      email: "merge@example.com",
      name: "Merge User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Compare",
      model: "auto",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_merge",
        email: "merge@example.com",
        name: "Merge User",
      },
      conversationId: conversation.id,
      content: "Which answer is best?",
      models: ["openai:gpt-5-mini", "anthropic:claude-sonnet-4"],
    });
    await service.process(started.requestId);

    const originalAssistants =
      await service.repository.getAssistantMessagesForRequest(
        started.requestId,
      );
    const comparisonGroupId = originalAssistants[0]?.comparisonGroupId;
    expect(comparisonGroupId).toBeTruthy();

    const consolidated = await service.startSameChatConsolidation({
      comparisonGroupId: comparisonGroupId!,
      consolidationModel: "openai:gpt-5",
    });
    await service.process(consolidated.requestId);

    const messages = await service.repository.listMessages(conversation.id);
    const mergedMessage = messages.find((message) =>
      consolidated.assistantMessageIds.includes(message.id),
    );
    const hiddenOriginals = messages.filter(
      (message) => message.consolidatedMessageId === mergedMessage?.id,
    );

    expect(mergedMessage).toMatchObject({
      isConsolidation: true,
      content: "merged answer",
      status: "complete",
      model: "openai:gpt-5",
    });
    expect(hiddenOriginals).toHaveLength(2);
    expect(provider.calls.at(-1)?.messages.at(-1)?.content).toContain(
      "Can you consolidate all of this information",
    );
  });

  it("creates a new conversation for consolidation", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const provider = new InspectableGenerationProvider({
      "openai:gpt-5-mini": ["first"],
      "anthropic:claude-sonnet-4": ["second"],
      "openai:gpt-5": ["standalone merge"],
    });
    const service = new GenerationV2Service(
      db,
      store,
      provider,
      async () => {},
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_merge_new",
      email: "merge-new@example.com",
      name: "Merge New User",
    });
    const sourceConversation = await conversations.create({
      userId: user.id,
      title: "Compare",
      model: "auto",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_merge_new",
        email: "merge-new@example.com",
        name: "Merge New User",
      },
      conversationId: sourceConversation.id,
      content: "Compare for export",
      models: ["openai:gpt-5-mini", "anthropic:claude-sonnet-4"],
    });
    await service.process(started.requestId);

    const originalAssistants =
      await service.repository.getAssistantMessagesForRequest(
        started.requestId,
      );
    const comparisonGroupId = originalAssistants[0]?.comparisonGroupId;

    const consolidated = await service.startNewConversationConsolidation({
      userId: user.id,
      comparisonGroupId: comparisonGroupId!,
      consolidationModel: "openai:gpt-5",
    });
    await service.process(consolidated.requestId);

    const newConversationMessages = await service.repository.listMessages(
      consolidated.conversationId,
    );

    expect(consolidated.conversationId).not.toBe(sourceConversation.id);
    expect(newConversationMessages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(newConversationMessages[0]?.content).toContain("Original prompt");
    expect(newConversationMessages[1]?.content).toBe("standalone merge");
  });

  it("creates a regenerated assistant sibling under the same user message", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5-mini": ["first"],
        "openai:gpt-5": ["second"],
      }),
      async () => {},
      (() => {
        let time = 2_000;
        return () => {
          time += 300;
          return time;
        };
      })(),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_regen",
      email: "regen@example.com",
      name: "Regen User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Regenerate",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_regen",
        email: "regen@example.com",
        name: "Regen User",
      },
      conversationId: conversation.id,
      content: "Say something twice",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    const originalAssistant = (
      await service.repository.getAssistantMessagesForRequest(started.requestId)
    )[0];
    expect(originalAssistant?.content).toBe("first");

    const regenerated = await service.repository.createRegenerationRequest({
      assistantMessageId: originalAssistant!.id,
      modelId: "openai:gpt-5",
    });

    await service.process(regenerated.requestId);

    const messages = await service.repository.listMessages(conversation.id);
    const assistants = messages.filter(
      (message) => message.role === "assistant",
    );

    expect(assistants).toHaveLength(2);
    expect(
      assistants.map((message) => ({
        content: message.content,
        forkReason: message.forkReason,
        siblingIndex: message.siblingIndex,
        model: message.model,
      })),
    ).toEqual([
      {
        content: "first",
        forkReason: null,
        siblingIndex: 0,
        model: "openai:gpt-5-mini",
      },
      {
        content: "second",
        forkReason: "regenerate",
        siblingIndex: 1,
        model: "openai:gpt-5",
      },
    ]);
  });

  it("creates an edited user branch and generates a fresh assistant response", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new FakeGenerationProvider({
        "openai:gpt-5-mini": ["first reply"],
        "openai:gpt-5": ["edited reply"],
      }),
      async () => {},
      (() => {
        let time = 3_000;
        return () => {
          time += 300;
          return time;
        };
      })(),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_edit",
      email: "edit@example.com",
      name: "Edit User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Edit",
      model: "openai:gpt-5-mini",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_edit",
        email: "edit@example.com",
        name: "Edit User",
      },
      conversationId: conversation.id,
      content: "Original prompt",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    const originalUserMessage = (
      await service.repository.listMessages(conversation.id)
    ).find((message) => message.role === "user");
    expect(originalUserMessage).toBeTruthy();

    const edited = await service.repository.createEditRequest({
      messageId: originalUserMessage!.id,
      content: "Edited prompt",
      modelId: "openai:gpt-5",
    });

    await service.process(edited.requestId);

    const messages = await service.repository.listMessages(conversation.id);
    const userMessages = messages.filter((message) => message.role === "user");
    const assistantMessages = messages.filter(
      (message) => message.role === "assistant",
    );
    const activePath = await conversations.getActivePath(conversation.id);

    expect(userMessages).toHaveLength(2);
    expect(
      userMessages.map((message) => ({
        content: message.content,
        siblingIndex: message.siblingIndex,
        forkReason: message.forkReason,
      })),
    ).toEqual([
      {
        content: "Original prompt",
        siblingIndex: 0,
        forkReason: null,
      },
      {
        content: "Edited prompt",
        siblingIndex: 1,
        forkReason: "edit",
      },
    ]);
    expect(assistantMessages.at(-1)?.content).toBe("edited reply");
    expect(activePath.map((message) => message.content)).toEqual([
      "Edited prompt",
      "edited reply",
    ]);
  });

  it("stops one comparison child session without cancelling the others", async () => {
    const db = await createTestPersistenceDb();
    const conversations = createConversationRepository(db);
    const store = new MemoryGenerationEventStore();
    const service = new GenerationV2Service(
      db,
      store,
      new ComparisonStopProvider(),
      async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    );

    const user = await service.repository.upsertUser({
      clerkId: "user_partial_stop",
      email: "partial-stop@example.com",
      name: "Partial Stop User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Partial Stop",
      model: "auto",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_partial_stop",
        email: "partial-stop@example.com",
        name: "Partial Stop User",
      },
      conversationId: conversation.id,
      models: ["openai:gpt-5-mini", "anthropic:claude-sonnet-4"],
      content: "Compare and stop one",
    });

    const bundle = await service.repository.getRequestBundle(started.requestId);
    const stopSessionId = bundle?.sessions[0]?.sessionId;
    expect(stopSessionId).toBeTruthy();

    const processing = service.process(started.requestId);
    await service.stopSession(started.requestId, stopSessionId!);
    const status = await processing;

    const assistants = await service.repository.getAssistantMessagesForRequest(
      started.requestId,
    );
    const cancelled = assistants.find(
      (message) => message.status === "cancelled",
    );
    const complete = assistants.find(
      (message) => message.status === "complete",
    );

    // The stop marked the request cancelling, so the request-level status
    // preserves the cancel intent even though the sibling session completed.
    expect(status).toBe("cancelled");
    expect(cancelled).toBeTruthy();
    expect(complete).toBeTruthy();
  });
});
