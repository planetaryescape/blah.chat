import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  createNeonDatabase,
  noteEmbeddings,
  notes,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";

type EmbedBatch = (values: string[]) => Promise<number[][]>;

export interface EmbedNoteDependencies {
  db?: PersistenceDb;
  now?: () => number;
  embedBatch?: EmbedBatch;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return databaseUrl;
}

function createDefaultEmbedBatch(): EmbedBatch {
  return async (values) => {
    const result = await embedMany({ model: EMBEDDING_MODEL, values });
    return result.embeddings as number[][];
  };
}

export async function embedNote(
  payload: { noteId: string },
  dependencies: EmbedNoteDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();

  const note = await db.query.notes.findFirst({
    where: eq(notes.id, payload.noteId),
  });

  if (!note) {
    return { success: true, skipped: "not_found" as const };
  }

  const content = [note.title, note.content].filter(Boolean).join("\n").trim();
  if (!content) {
    return { success: true, skipped: "empty_content" as const };
  }

  const [embedding] = await embedBatch([content]);
  if (!embedding) {
    return { success: true, skipped: "embed_failed" as const };
  }

  const timestamp = now();

  // Atomic upsert on the note_embeddings.note_key unique index — no
  // delete-then-insert window where the row is missing.
  await db
    .insert(noteEmbeddings)
    .values({
      userId: note.userId,
      noteKey: note.id,
      content,
      embedding,
      searchDocument: content,
      metadata: { tags: note.tags },
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: noteEmbeddings.noteKey,
      set: {
        userId: note.userId,
        content,
        embedding,
        searchDocument: content,
        metadata: { tags: note.tags },
        updatedAt: timestamp,
      },
    });

  return { success: true };
}

export const embedNoteTask = task({
  id: "embed-note",
  // Serialize per entity: enqueuers pass concurrencyKey=noteId so each note
  // gets its own single-slot queue (stale runs can't clobber fresh).
  queue: { concurrencyLimit: 1 },
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { noteId: string }) => {
    return embedNote(payload);
  },
});
