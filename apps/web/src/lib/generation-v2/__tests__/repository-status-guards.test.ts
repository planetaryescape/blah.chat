/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  generationRequests,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { createGenerationV2Repository } from "../repository";

async function setupRequest(
  seed: string,
  models: string[] = ["openai:gpt-5-mini"],
) {
  const db = await createTestPersistenceDb();
  const repo = createGenerationV2Repository(db);
  const conversations = createConversationRepository(db);

  const user = await repo.upsertUser({
    clerkId: `clerk_${seed}`,
    email: `${seed}@test.com`,
    name: seed,
  });
  const conversation = await conversations.create({
    userId: user.id,
    title: "Status guards",
    model: models[0]!,
  });

  const started = await repo.createRequest({
    clerkUser: {
      clerkId: `clerk_${seed}`,
      email: `${seed}@test.com`,
      name: seed,
    },
    conversationId: conversation.id,
    content: "Guard me",
    ...(models.length > 1 ? { models } : { modelId: models[0]! }),
  });

  const bundle = await repo.getRequestBundle(started.requestId);
  if (!bundle) {
    throw new Error("Bundle not found");
  }

  return { db, repo, conversation, user, started, bundle };
}

describe("terminal status guards", () => {
  it("ignores a late complete after a session was cancelled", async () => {
    const { repo, started, bundle } = await setupRequest("late_complete");
    const session = bundle.sessions[0]!;

    await repo.updateSessionStatus(session.sessionId, "cancelled");
    await repo.updateAssistantMessage({
      assistantMessageId: session.assistantMessageId,
      content: "partial",
      status: "cancelled",
    });

    // A straggling worker tries to finish the session after cancellation.
    await repo.updateSessionStatus(session.sessionId, "complete");
    await repo.updateAssistantMessage({
      assistantMessageId: session.assistantMessageId,
      content: "full late content",
      status: "complete",
    });

    const refreshed = await repo.getRequestBundle(started.requestId);
    expect(refreshed?.sessions[0]?.status).toBe("cancelled");

    const assistants = await repo.getAssistantMessagesForRequest(
      started.requestId,
    );
    expect(assistants[0]).toMatchObject({
      content: "partial",
      status: "cancelled",
    });
  });

  it("markRequestCancelling only transitions pending or running requests", async () => {
    const { repo, started } = await setupRequest("cancel_guard");

    await repo.updateRequestStatus(started.requestId, "complete");
    await repo.markRequestCancelling(started.requestId);

    expect(await repo.getRequestStatus(started.requestId)).toBe("complete");
  });

  it("updateRequestStatus never overwrites a terminal request status", async () => {
    const { repo, started } = await setupRequest("terminal_request");

    await repo.updateRequestStatus(started.requestId, "cancelled");
    await repo.updateRequestStatus(started.requestId, "complete");

    expect(await repo.getRequestStatus(started.requestId)).toBe("cancelled");
  });

  it("refreshRequestStatus preserves cancel intent for mixed terminal sessions", async () => {
    const { repo, started, bundle } = await setupRequest("mixed_cancel", [
      "openai:gpt-5-mini",
      "anthropic:claude-sonnet-4",
    ]);
    const [first, second] = bundle.sessions;

    await repo.updateRequestStatus(started.requestId, "running");
    await repo.markRequestCancelling(started.requestId);
    await repo.updateSessionStatus(first!.sessionId, "cancelled");
    await repo.updateSessionStatus(second!.sessionId, "complete");

    const status = await repo.refreshRequestStatus(started.requestId);

    expect(status).toBe("cancelled");
    expect(await repo.getRequestStatus(started.requestId)).toBe("cancelled");
  });

  it("refreshRequestStatus resolves cancelling to complete only when every session completed", async () => {
    const { repo, started, bundle } = await setupRequest("late_stop", [
      "openai:gpt-5-mini",
      "anthropic:claude-sonnet-4",
    ]);

    await repo.updateRequestStatus(started.requestId, "running");
    await repo.markRequestCancelling(started.requestId);
    for (const session of bundle.sessions) {
      await repo.updateSessionStatus(session.sessionId, "complete");
    }

    const status = await repo.refreshRequestStatus(started.requestId);

    expect(status).toBe("complete");
    expect(await repo.getRequestStatus(started.requestId)).toBe("complete");
  });

  it("refreshRequestStatus never downgrades a terminal request status", async () => {
    const { repo, started, bundle } = await setupRequest("no_downgrade");

    await repo.updateRequestStatus(started.requestId, "cancelled");
    await repo.updateSessionStatus(bundle.sessions[0]!.sessionId, "complete");

    const status = await repo.refreshRequestStatus(started.requestId);

    expect(status).toBe("cancelled");
    expect(await repo.getRequestStatus(started.requestId)).toBe("cancelled");
  });
});

describe("checkpoint heartbeat", () => {
  it("bumps generationRequests.updatedAt on every checkpoint write", async () => {
    const { db, repo, started, bundle } = await setupRequest("heartbeat");
    const staleUpdatedAt = Date.now() - 10 * 60 * 1000;

    await db
      .update(generationRequests)
      .set({ updatedAt: staleUpdatedAt })
      .where(eq(generationRequests.id, started.requestId));

    await repo.insertCheckpoint({
      requestId: started.requestId,
      sessionId: bundle.sessions[0]!.sessionId,
      content: "partial",
      sequence: 1,
    });

    const request = await db.query.generationRequests.findFirst({
      where: eq(generationRequests.id, started.requestId),
    });
    expect(request?.updatedAt).toBeGreaterThan(staleUpdatedAt);
  });
});
