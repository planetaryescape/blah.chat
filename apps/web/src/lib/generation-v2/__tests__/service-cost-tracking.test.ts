/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  usageRecords,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type {
  GenerationProvider,
  GenerationProviderStreamInput,
  GenerationUsage,
} from "../types";

class UsageAwareProvider implements GenerationProvider {
  constructor(
    private readonly outputs: Record<string, string[]>,
    private readonly usageByModel: Record<string, GenerationUsage>,
  ) {}

  async *streamText(input: GenerationProviderStreamInput) {
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }

  async getUsage(input: { requestId: string; sessionId: string }) {
    void input;
    // Return the usage configured for whatever the most recent stream targeted.
    // For these tests we always have a single model so picking the first key is fine.
    const firstKey = Object.keys(this.usageByModel)[0];
    return firstKey ? (this.usageByModel[firstKey] ?? null) : null;
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
    clerkId: "user_cost",
    email: "cost@test.com",
    name: "Cost Tester",
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: "Cost test",
    model: "openai:gpt-5-mini",
  });

  return { service, db, store, conversation, user };
}

describe("GenerationV2Service usage_records writes", () => {
  it("writes a usage_records row with cost computed from MODEL_CONFIG pricing on completion", async () => {
    // openai:gpt-5-mini pricing per packages/ai/src/models.ts: input $0.25 / output $2.0 per 1M tokens
    // 1000 input + 500 output → 0.00025 + 0.001 = 0.00125 USD
    const expectedCost = 0.00125;

    const provider = new UsageAwareProvider(
      { "openai:gpt-5-mini": ["Hello", " world"] },
      {
        "openai:gpt-5-mini": {
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
        },
      },
    );
    const { service, db, conversation, user } = await setupService(provider);

    const started = await service.start({
      clerkUser: {
        clerkId: "user_cost",
        email: "cost@test.com",
        name: "Cost Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    const status = await service.process(started.requestId);
    expect(status).toBe("complete");

    const records = await db.query.usageRecords.findMany({
      where: eq(usageRecords.conversationId, conversation.id),
    });

    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.userId).toBe(user.id);
    expect(record.model).toBe("openai:gpt-5-mini");
    expect(record.inputTokens).toBe(1000);
    expect(record.outputTokens).toBe(500);
    expect(record.cost).toBeCloseTo(expectedCost, 8);
    expect(record.isByok).toBe(false);
  });
});
