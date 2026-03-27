import { users } from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "../test-helpers";
import { batchInsert } from "./batch-inserter";

let db: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  db = await createTestDb();
});

describe("batchInsert", () => {
  it("inserts a batch of rows", async () => {
    const result = await batchInsert(db, users as unknown as PgTable, [
      {
        id: "test-user-1",
        clerkId: "clerk_1",
        email: "alice@test.com",
        name: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    expect(result.inserted).toBe(1);

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, "test-user-1"));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Alice");
  });

  it("inserts multiple rows in a single batch and persists all data", async () => {
    const now = Date.now();
    const rows = Array.from({ length: 5 }, (_, i) => ({
      id: `batch-user-${i}`,
      clerkId: `clerk_batch_${i}`,
      email: `user${i}@test.com`,
      name: `User ${i}`,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await batchInsert(db, users as unknown as PgTable, rows);
    expect(result.inserted).toBe(5);

    // Verify first and last rows persisted with correct data
    const first = await db
      .select()
      .from(users)
      .where(eq(users.id, "batch-user-0"));
    expect(first[0].name).toBe("User 0");
    const last = await db
      .select()
      .from(users)
      .where(eq(users.id, "batch-user-4"));
    expect(last[0].name).toBe("User 4");
  });

  it("handles ON CONFLICT DO NOTHING for idempotent re-runs", async () => {
    const now = Date.now();
    const row = {
      id: "idempotent-user",
      clerkId: "clerk_idemp",
      email: "idemp@test.com",
      name: "Original",
      createdAt: now,
      updatedAt: now,
    };

    // First insert
    await batchInsert(db, users as unknown as PgTable, [row]);

    // Second insert with same ID — should not fail
    const result = await batchInsert(db, users as unknown as PgTable, [
      { ...row, name: "Changed" },
    ]);

    // Count is approximate (includes skipped conflicts)
    expect(result.skipped).toBe(0); // No FK errors, just PK conflict handled silently

    // Original should be preserved
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, "idempotent-user"));
    expect(rows[0].name).toBe("Original");
  });

  it("returns 0 for empty input", async () => {
    const result = await batchInsert(db, users as unknown as PgTable, []);
    expect(result.inserted).toBe(0);
  });

  it("splits large arrays into configurable batch sizes", async () => {
    const now = Date.now();
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: `chunked-user-${i}`,
      clerkId: `clerk_chunked_${i}`,
      email: `chunked${i}@test.com`,
      name: `Chunked ${i}`,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await batchInsert(db, users as unknown as PgTable, rows, {
      batchSize: 10,
    });
    expect(result.inserted).toBe(25);
  });
});
