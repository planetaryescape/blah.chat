/**
 * @vitest-environment node
 */
import { createConversationRepository } from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { GenerationV2Service } from "../service";
import { MemoryGenerationEventStore } from "../store";
import type { GenerationProvider } from "../types";

class FakeGenerationProvider implements GenerationProvider {
  constructor(private readonly outputs: Record<string, string[]>) {}

  async *streamText(input: { modelId: string }) {
    for (const chunk of this.outputs[input.modelId] ?? []) {
      yield chunk;
    }
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

    expect(status).toBe("complete");
    expect(cancelled).toBeTruthy();
    expect(complete).toBeTruthy();
  });
});
