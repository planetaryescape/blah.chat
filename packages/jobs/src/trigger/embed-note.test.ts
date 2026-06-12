import {
  createUserRepository,
  noteEmbeddings,
  notes,
} from "@blah-chat/persistence-postgres";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { embedNote } from "./embed-note";

// The pglite bootstrap schema lags behind schema.ts, which declares this
// unique index (note_embeddings_by_note_key); the upsert relies on it.
async function createDb() {
  const db = await createTestPersistenceDb();
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS note_embeddings_by_note_key ON note_embeddings (note_key)`,
  );
  return db;
}

describe("embedNote", () => {
  it("generates embedding from title + content and inserts into noteEmbeddings", async () => {
    const db = await createDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_embed_note",
      email: "embed-note@example.com",
      name: "Embed Note",
    });

    const [note] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title: "Meeting Notes",
        content: "Discussed the postgres migration timeline.",
        tags: [],
        isPinned: false,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const result = await embedNote(
      { noteId: note!.id },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => {
          expect(values[0]).toContain("Meeting Notes");
          expect(values[0]).toContain("postgres migration timeline");
          return values.map(() => [0.1, 0.2, 0.3]);
        },
      },
    );

    expect(result).toMatchObject({ success: true });

    const rows = await db.query.noteEmbeddings.findMany({
      where: eq(noteEmbeddings.noteKey, note!.id),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(rows[0]?.userId).toBe(user.id);
  });

  it("skips if note not found", async () => {
    const db = await createDb();
    const result = await embedNote(
      { noteId: "nonexistent" },
      { db, now: () => 1, embedBatch: async (v) => v.map(() => [0.1]) },
    );
    expect(result).toMatchObject({ success: true, skipped: "not_found" });
  });

  it("is idempotent - upserts on re-embed", async () => {
    const db = await createDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_note_idem",
      email: "note-idem@example.com",
      name: "Note Idem",
    });

    const [note] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title: "Re-embed",
        content: "First version",
        tags: [],
        isPinned: false,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const baseDeps = { db, now: () => 1 };
    await embedNote(
      { noteId: note!.id },
      { ...baseDeps, embedBatch: async (v) => v.map(() => [0.1, 0.2]) },
    );
    await embedNote(
      { noteId: note!.id },
      { ...baseDeps, embedBatch: async (v) => v.map(() => [0.3, 0.4]) },
    );

    const rows = await db.query.noteEmbeddings.findMany({
      where: eq(noteEmbeddings.noteKey, note!.id),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.embedding).toEqual([0.3, 0.4]);
  });
});
