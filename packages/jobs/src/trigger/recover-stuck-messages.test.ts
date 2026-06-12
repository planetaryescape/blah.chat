import {
  createConversationRepository,
  createGenerationRepository,
  createMessageRepository,
  createUserRepository,
  generationSessions,
  messages,
} from "@blah-chat/persistence-postgres";
import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { recoverStuckMessages } from "./recover-stuck-messages";

const TEN_MINUTES = 10 * 60 * 1000;

async function seedStuckMessage(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  opts: { status: string; ageMs: number },
) {
  const users = createUserRepository(db);
  const convos = createConversationRepository(db);
  const msgs = createMessageRepository(db);

  const user = await users.upsertFromClerk({
    clerkId: `clerk_${Math.random().toString(36).slice(2)}`,
    email: "test@example.com",
    name: "Test User",
  });

  const conversation = await convos.create({
    userId: user.id,
    title: "Test Conversation",
    model: "openai:gpt-5-mini",
  });

  const now = Date.now();
  const msg = await msgs.create({
    conversationId: conversation.id,
    userId: user.id,
    role: "assistant",
    content: "",
    status: opts.status,
    parentMessageIds: [],
    siblingIndex: 0,
  });

  // Backdate the message
  await db
    .update(messages)
    .set({ updatedAt: now - opts.ageMs, createdAt: now - opts.ageMs })
    .where(eq(messages.id, msg.id));

  return { user, conversation, message: msg };
}

describe("recoverStuckMessages", () => {
  it("recovers messages stuck in generating state for >10min", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const { message } = await seedStuckMessage(db, {
      status: "generating",
      ageMs: TEN_MINUTES + 60_000,
    });

    const result = await recoverStuckMessages({ db, now });

    expect(result.recovered).toBe(1);

    const updated = await db.query.messages.findFirst({
      where: eq(messages.id, message.id),
    });
    expect(updated?.status).toBe("error");
  });

  it("recovers messages stuck in pending state for >10min", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const { message } = await seedStuckMessage(db, {
      status: "pending",
      ageMs: TEN_MINUTES + 60_000,
    });

    const result = await recoverStuckMessages({ db, now });

    expect(result.recovered).toBe(1);

    const updated = await db.query.messages.findFirst({
      where: eq(messages.id, message.id),
    });
    expect(updated?.status).toBe("error");
  });

  it("does not recover messages younger than 10 minutes", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedStuckMessage(db, {
      status: "generating",
      ageMs: 5 * 60 * 1000,
    });

    const result = await recoverStuckMessages({ db, now });

    expect(result.recovered).toBe(0);
  });

  it("does not recover completed messages", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedStuckMessage(db, {
      status: "complete",
      ageMs: TEN_MINUTES + 60_000,
    });

    const result = await recoverStuckMessages({ db, now });

    expect(result.recovered).toBe(0);
  });

  it("also errors stale pending sessions belonging to recovered messages", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const gens = createGenerationRepository(db);

    const { user, conversation } = await seedStuckMessage(db, {
      status: "generating",
      ageMs: TEN_MINUTES + 60_000,
    });

    // Create a generation whose assistant message + session are both stale
    const gen = await gens.createSingleModel({
      conversationId: conversation.id,
      userId: user.id,
      content: "Test prompt",
      modelId: "openai:gpt-5-mini",
    });
    await db
      .update(messages)
      .set({ updatedAt: now - TEN_MINUTES - 60_000 })
      .where(eq(messages.id, gen.assistantMessage.id));
    await db
      .update(generationSessions)
      .set({ updatedAt: now - TEN_MINUTES - 60_000 })
      .where(eq(generationSessions.id, gen.session.id));

    const result = await recoverStuckMessages({ db, now });

    expect(result.recovered).toBeGreaterThanOrEqual(1);

    const session = await db.query.generationSessions.findFirst({
      where: eq(generationSessions.id, gen.session.id),
    });
    expect(session?.status).toBe("error");
  });

  it("leaves sessions alone when they do not belong to a recovered message", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const gens = createGenerationRepository(db);

    const { user, conversation } = await seedStuckMessage(db, {
      status: "generating",
      ageMs: TEN_MINUTES + 60_000,
    });

    // Fresh generation in the same conversation: its session must survive
    const gen = await gens.createSingleModel({
      conversationId: conversation.id,
      userId: user.id,
      content: "Another prompt",
      modelId: "openai:gpt-5-mini",
    });

    const result = await recoverStuckMessages({ db, now });

    expect(result.recovered).toBeGreaterThanOrEqual(1);

    const session = await db.query.generationSessions.findFirst({
      where: eq(generationSessions.id, gen.session.id),
    });
    expect(session?.status).toBe("pending");
  });

  it("limits recovered messages to the configured batch size", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedStuckMessage(db, {
      status: "generating",
      ageMs: TEN_MINUTES + 60_000,
    });
    await seedStuckMessage(db, {
      status: "generating",
      ageMs: TEN_MINUTES + 60_000,
    });
    await seedStuckMessage(db, {
      status: "pending",
      ageMs: TEN_MINUTES + 60_000,
    });

    const result = await recoverStuckMessages({ db, now, batchSize: 2 });

    expect(result.recovered).toBe(2);

    const stillStuck = await db.query.messages.findMany({
      where: inArray(messages.status, ["pending", "generating"]),
    });
    expect(stillStuck).toHaveLength(1);
  });
});
