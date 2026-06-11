import {
  createConversationRepository,
  createGenerationRepository,
  createUserRepository,
  generationCheckpoints,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { pruneGenerationCheckpoints } from "./prune-generation-checkpoints";

async function seedCheckpoint(
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

  const [checkpoint] = await db
    .insert(generationCheckpoints)
    .values({
      sessionId: gen.session.id,
      content: "partial content",
      sequence: 1,
      createdAt: Date.now() - opts.ageMs,
    })
    .returning();

  return checkpoint;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe("pruneGenerationCheckpoints", () => {
  it("deletes checkpoints older than 30 days", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedCheckpoint(db, { ageMs: THIRTY_DAYS_MS + 60_000 });

    const result = await pruneGenerationCheckpoints({ db, now });

    expect(result.pruned).toBe(1);

    const remaining = await db.select().from(generationCheckpoints);
    expect(remaining.length).toBe(0);
  });

  it("keeps checkpoints younger than 30 days", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedCheckpoint(db, { ageMs: THIRTY_DAYS_MS - 60_000 });

    const result = await pruneGenerationCheckpoints({ db, now });

    expect(result.pruned).toBe(0);

    const remaining = await db.select().from(generationCheckpoints);
    expect(remaining.length).toBe(1);
  });
});
