import {
  createUserRepository,
  memoryEmbeddings,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { markExpiredMemories } from "./mark-expired-memories";

const DAY_MS = 24 * 60 * 60 * 1000;

async function seedMemory(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  opts: { expiresAt?: number; content?: string },
) {
  const users = createUserRepository(db);
  const user = await users.upsertFromClerk({
    clerkId: `clerk_${Math.random().toString(36).slice(2)}`,
    email: "test@example.com",
    name: "Test User",
  });

  const now = Date.now();
  const dummyEmbedding = Array.from({ length: 1536 }, () => 0.01);

  const [row] = await db
    .insert(memoryEmbeddings)
    .values({
      userId: user.id,
      content: opts.content ?? "Test memory fact",
      embedding: dummyEmbedding,
      metadata:
        opts.expiresAt !== undefined ? { expiresAt: opts.expiresAt } : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { user, memory: row! };
}

describe("markExpiredMemories", () => {
  it("deletes memories with expiresAt older than 90 days", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedMemory(db, {
      expiresAt: now - 91 * DAY_MS,
      content: "Old expired memory",
    });

    const result = await markExpiredMemories({ db, now });

    expect(result.deleted).toBe(1);

    const remaining = await db.query.memoryEmbeddings.findMany();
    expect(remaining).toHaveLength(0);
  });

  it("does not delete memories with recent expiresAt", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedMemory(db, {
      expiresAt: now - 30 * DAY_MS,
      content: "Recent expired memory",
    });

    const result = await markExpiredMemories({ db, now });

    expect(result.deleted).toBe(0);

    const remaining = await db.query.memoryEmbeddings.findMany();
    expect(remaining).toHaveLength(1);
  });

  it("does not delete memories without expiresAt", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    await seedMemory(db, { content: "Permanent memory" });

    const result = await markExpiredMemories({ db, now });

    expect(result.deleted).toBe(0);

    const remaining = await db.query.memoryEmbeddings.findMany();
    expect(remaining).toHaveLength(1);
  });
});
