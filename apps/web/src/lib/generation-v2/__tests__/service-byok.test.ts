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

class CapturingProvider implements GenerationProvider {
  public lastInput: GenerationProviderStreamInput | undefined;

  constructor(
    private readonly outputs: Record<string, string[]>,
    private readonly usage: GenerationUsage,
  ) {}

  async *streamText(input: GenerationProviderStreamInput) {
    this.lastInput = input;
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
  }

  async getUsage() {
    return this.usage;
  }
}

async function setup(opts: { byokEnabled: boolean; byokGatewayKey?: string }) {
  const db = await createTestPersistenceDb();
  const conversations = createConversationRepository(db);
  const store = new MemoryGenerationEventStore();
  const provider = new CapturingProvider(
    { "openai:gpt-5-mini": ["Hello", " world"] },
    { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  );

  let time = 1_000;
  const now = () => {
    time += 100;
    return time;
  };

  const resolveByokKeys = async (_userId: string) => ({
    enabled: opts.byokEnabled,
    gatewayKey: opts.byokGatewayKey,
  });

  const service = new GenerationV2Service(
    db,
    store,
    provider,
    async () => {},
    now,
    undefined,
    undefined,
    resolveByokKeys,
  );

  const user = await (service as any).repository.upsertUser({
    clerkId: "user_byok",
    email: "byok@test.com",
    name: "BYOK Tester",
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: "BYOK test",
    model: "openai:gpt-5-mini",
  });

  return { service, db, store, conversation, user, provider };
}

describe("GenerationV2Service BYOK wiring", () => {
  it("threads the BYOK gateway key into the provider's streamText input", async () => {
    const { service, conversation, provider } = await setup({
      byokEnabled: true,
      byokGatewayKey: "user-gateway-key-secret",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_byok",
        email: "byok@test.com",
        name: "BYOK Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    expect(provider.lastInput?.byokGatewayKey).toBe("user-gateway-key-secret");
  });

  it("marks usage_records.isByok=true when BYOK is active", async () => {
    const { service, db, conversation } = await setup({
      byokEnabled: true,
      byokGatewayKey: "user-gateway-key-secret",
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_byok",
        email: "byok@test.com",
        name: "BYOK Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    const records = await db.query.usageRecords.findMany({
      where: eq(usageRecords.conversationId, conversation.id),
    });
    expect(records).toHaveLength(1);
    expect(records[0]!.isByok).toBe(true);
  });

  it("does not pass a BYOK gateway key when the resolver reports disabled", async () => {
    const { service, conversation, provider } = await setup({
      byokEnabled: false,
    });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_byok",
        email: "byok@test.com",
        name: "BYOK Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    expect(provider.lastInput?.byokGatewayKey).toBeUndefined();
  });

  it("marks usage_records.isByok=false when BYOK is disabled", async () => {
    const { service, db, conversation } = await setup({ byokEnabled: false });

    const started = await service.start({
      clerkUser: {
        clerkId: "user_byok",
        email: "byok@test.com",
        name: "BYOK Tester",
      },
      conversationId: conversation.id,
      content: "Say hi",
      modelId: "openai:gpt-5-mini",
    });

    await service.process(started.requestId);

    const records = await db.query.usageRecords.findMany({
      where: eq(usageRecords.conversationId, conversation.id),
    });
    expect(records).toHaveLength(1);
    expect(records[0]!.isByok).toBe(false);
  });
});
