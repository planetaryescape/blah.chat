import {
  createConversationRepository,
  createGenerationRepository,
  createUserRepository,
  generationSessions,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { cleanupStaleGenerationSessions } from "./cleanup-stale-generation-sessions";

async function seedPendingSession(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  opts: { ageMs: number },
) {
  const users = createUserRepository(db);
  const convos = createConversationRepository(db);
  const gens = createGenerationRepository(db);

  const user = await users.upsertFromClerk({
    clerkId: `clerk_${Math.random().toString(36).slice(2)}`,
    email: "test@example.com",
    name: "Test User",
  });

  const conversation = await convos.create({
    userId: user.id,
    title: "Test",
    model: "openai:gpt-5-mini",
  });

  const gen = await gens.createSingleModel({
    conversationId: conversation.id,
    userId: user.id,
    content: "Test prompt",
    modelId: "openai:gpt-5-mini",
  });

  // Backdate the session
  const now = Date.now();
  await db
    .update(generationSessions)
    .set({ createdAt: now - opts.ageMs })
    .where(eq(generationSessions.id, gen.session.id));

  return gen;
}

describe("cleanupStaleGenerationSessions", () => {
  it("fails pending sessions older than 60s", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const gen = await seedPendingSession(db, { ageMs: 90_000 });

    const result = await cleanupStaleGenerationSessions({ db, now });

    expect(result.cleaned).toBe(1);

    const session = await db.query.generationSessions.findFirst({
      where: eq(generationSessions.id, gen.session.id),
    });
    expect(session?.status).toBe("failed");
  });

  it("does not touch sessions younger than 60s", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const gen = await seedPendingSession(db, { ageMs: 30_000 });

    const result = await cleanupStaleGenerationSessions({ db, now });

    expect(result.cleaned).toBe(0);

    const session = await db.query.generationSessions.findFirst({
      where: eq(generationSessions.id, gen.session.id),
    });
    expect(session?.status).toBe("pending");
  });

  it("does not touch non-pending sessions", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const gen = await seedPendingSession(db, { ageMs: 90_000 });

    // Mark session as completed first
    await db
      .update(generationSessions)
      .set({ status: "completed" })
      .where(eq(generationSessions.id, gen.session.id));

    const result = await cleanupStaleGenerationSessions({ db, now });

    expect(result.cleaned).toBe(0);
  });
});
