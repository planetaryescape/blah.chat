/**
 * @vitest-environment node
 */
import type { ThinkingEffort } from "@blah-chat/ai";
import {
  conversations,
  createConversationRepository,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type { GenerationProvider } from "../types";

class EffortCapturingProvider implements GenerationProvider {
  calls: Array<{ modelId: string; thinkingEffort?: ThinkingEffort }> = [];

  async *streamText(input: {
    modelId: string;
    thinkingEffort?: ThinkingEffort;
  }) {
    this.calls.push({
      modelId: input.modelId,
      thinkingEffort: input.thinkingEffort,
    });
    yield "ok";
  }
}

async function setup(thinkingEffort?: ThinkingEffort) {
  const db = await createTestPersistenceDb();
  const provider = new EffortCapturingProvider();
  const service = new GenerationV2Service(
    db,
    new MemoryGenerationEventStore(),
    provider,
    async () => {},
    (() => {
      let time = 1_000;
      return () => {
        time += 300;
        return time;
      };
    })(),
  );

  const user = await service.repository.upsertUser({
    clerkId: "user_effort",
    email: "effort@example.com",
    name: "Effort",
  });
  const conversation = await createConversationRepository(db).create({
    userId: user.id,
    title: "Effort",
    model: "openai:gpt-5-mini",
  });

  if (thinkingEffort) {
    await db
      .update(conversations)
      .set({ thinkingEffort })
      .where(eq(conversations.id, conversation.id));
  }

  return { service, provider, conversationId: conversation.id };
}

describe("GenerationV2Service thinking effort", () => {
  it("threads the conversation's thinkingEffort through to the provider", async () => {
    const { service, provider, conversationId } = await setup("high");

    const started = await service.start({
      clerkUser: {
        clerkId: "user_effort",
        email: "effort@example.com",
        name: "Effort",
      },
      conversationId,
      content: "Think hard",
      modelId: "openai:gpt-5-mini",
    });
    const status = await service.process(started.requestId);

    expect(status).toBe("complete");
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.thinkingEffort).toBe("high");
  });

  it('passes "none" (the default) when the conversation never set an effort', async () => {
    const { service, provider, conversationId } = await setup();

    const started = await service.start({
      clerkUser: {
        clerkId: "user_effort",
        email: "effort@example.com",
        name: "Effort",
      },
      conversationId,
      content: "No thinking",
      modelId: "openai:gpt-5-mini",
    });
    const status = await service.process(started.requestId);

    expect(status).toBe("complete");
    expect(provider.calls[0]?.thinkingEffort).toBe("none");
  });
});
