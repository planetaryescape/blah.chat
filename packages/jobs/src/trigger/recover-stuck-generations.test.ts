import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  generationRequests,
  generationSessions,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { recoverStuckGenerations } from "./recover-stuck-generations";

const NINETY_SECONDS = 90 * 1000;

async function seedRequest(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  opts: { status: string; ageMs: number },
) {
  const users = createUserRepository(db);
  const convos = createConversationRepository(db);
  const msgs = createMessageRepository(db);
  const user = await users.upsertFromClerk({
    clerkId: `clerk_${Math.random().toString(36).slice(2)}`,
    email: "stuck-gen@example.com",
    name: "Stuck Gen",
  });
  const conversation = await convos.create({
    userId: user.id,
    title: "Test",
    model: "openai:gpt-5-mini",
  });
  const userMessage = await msgs.create({
    conversationId: conversation.id,
    userId: user.id,
    role: "user",
    content: "hi",
    status: "complete",
    parentMessageIds: [],
    siblingIndex: 0,
  });

  const now = Date.now();
  const inserted = await db
    .insert(generationRequests)
    .values({
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      requestedModels: ["openai:gpt-5-mini"],
      status: opts.status,
      createdAt: now - opts.ageMs,
      updatedAt: now - opts.ageMs,
    })
    .returning();

  return { user, conversation, request: inserted[0]! };
}

describe("recoverStuckGenerations", () => {
  it("re-enqueues a running request whose updatedAt is older than the freshness threshold", async () => {
    const db = await createTestPersistenceDb();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    const { request } = await seedRequest(db, {
      status: "running",
      ageMs: NINETY_SECONDS + 30_000,
    });

    const result = await recoverStuckGenerations({ db, now, enqueue });

    expect(result.recovered).toBe(1);
    expect(enqueue).toHaveBeenCalledWith(request.id);

    const refreshed = await db.query.generationRequests.findFirst({
      where: eq(generationRequests.id, request.id),
    });
    expect(refreshed?.status).toBe("pending");
  });

  it("does not touch running requests still within the freshness window", async () => {
    const db = await createTestPersistenceDb();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    await seedRequest(db, { status: "running", ageMs: 30_000 });

    const result = await recoverStuckGenerations({ db, now, enqueue });

    expect(result.recovered).toBe(0);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("re-enqueues a cancelling request that has gone stale", async () => {
    const db = await createTestPersistenceDb();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    const { request } = await seedRequest(db, {
      status: "cancelling",
      ageMs: NINETY_SECONDS + 30_000,
    });

    const result = await recoverStuckGenerations({ db, now, enqueue });

    expect(result.recovered).toBe(1);
    expect(enqueue).toHaveBeenCalledWith(request.id);
  });

  it("ignores terminal requests (complete, error, cancelled) regardless of age", async () => {
    const db = await createTestPersistenceDb();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    await seedRequest(db, {
      status: "complete",
      ageMs: NINETY_SECONDS * 10,
    });
    await seedRequest(db, { status: "error", ageMs: NINETY_SECONDS * 10 });
    await seedRequest(db, {
      status: "cancelled",
      ageMs: NINETY_SECONDS * 10,
    });

    const result = await recoverStuckGenerations({ db, now, enqueue });

    expect(result.recovered).toBe(0);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("does not reset a stale request that still has a freshly heartbeating session", async () => {
    const db = await createTestPersistenceDb();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    const { user, conversation, request } = await seedRequest(db, {
      status: "running",
      ageMs: NINETY_SECONDS + 30_000,
    });

    const msgs = createMessageRepository(db);
    const assistantMessage = await msgs.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "",
      status: "generating",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    // Session heartbeated 5 seconds ago: the request is still alive.
    await db.insert(generationSessions).values({
      requestId: request.id,
      assistantMessageId: assistantMessage.id,
      modelId: "openai:gpt-5-mini",
      status: "streaming",
      createdAt: now - NINETY_SECONDS - 30_000,
      updatedAt: now - 5_000,
    });

    const result = await recoverStuckGenerations({ db, now, enqueue });

    expect(result.recovered).toBe(0);
    expect(enqueue).not.toHaveBeenCalled();

    const refreshed = await db.query.generationRequests.findFirst({
      where: eq(generationRequests.id, request.id),
    });
    expect(refreshed?.status).toBe("running");
  });

  it("resets a stale request whose sessions are all stale too", async () => {
    const db = await createTestPersistenceDb();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    const { user, conversation, request } = await seedRequest(db, {
      status: "running",
      ageMs: NINETY_SECONDS + 30_000,
    });

    const msgs = createMessageRepository(db);
    const assistantMessage = await msgs.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "",
      status: "generating",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await db.insert(generationSessions).values({
      requestId: request.id,
      assistantMessageId: assistantMessage.id,
      modelId: "openai:gpt-5-mini",
      status: "streaming",
      createdAt: now - NINETY_SECONDS - 30_000,
      updatedAt: now - NINETY_SECONDS - 20_000,
    });

    const result = await recoverStuckGenerations({ db, now, enqueue });

    expect(result.recovered).toBe(1);
    expect(enqueue).toHaveBeenCalledWith(request.id);
  });

  it("recovers multiple stuck requests in one run", async () => {
    const db = await createTestPersistenceDb();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    const { request: a } = await seedRequest(db, {
      status: "running",
      ageMs: NINETY_SECONDS + 60_000,
    });
    const { request: b } = await seedRequest(db, {
      status: "cancelling",
      ageMs: NINETY_SECONDS + 60_000,
    });

    const result = await recoverStuckGenerations({ db, now, enqueue });

    expect(result.recovered).toBe(2);
    expect(enqueue).toHaveBeenCalledWith(a.id);
    expect(enqueue).toHaveBeenCalledWith(b.id);
  });
});
