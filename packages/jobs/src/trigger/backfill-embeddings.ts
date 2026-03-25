import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  createNeonDatabase,
  messageEmbeddings,
  messages,
  noteEmbeddings,
  notes,
  type PersistenceDb,
  taskEmbeddings,
  tasks,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import { eq, isNull } from "drizzle-orm";

type EmbedBatch = (values: string[]) => Promise<number[][]>;

export interface BackfillDependencies {
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

export async function backfillMessageEmbeddings(
  payload: { batchSize?: number; userId?: string },
  dependencies: BackfillDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();
  const batchSize = payload.batchSize ?? 50;

  // Find messages without embeddings
  const gaps = await db
    .select({
      id: messages.id,
      content: messages.content,
      conversationId: messages.conversationId,
      userId: messages.userId,
    })
    .from(messages)
    .leftJoin(messageEmbeddings, eq(messageEmbeddings.messageId, messages.id))
    .where(isNull(messageEmbeddings.id))
    .limit(batchSize);

  if (gaps.length === 0) {
    return { processed: 0 };
  }

  const contents = gaps.map((g) => g.content);
  const embeddings = await embedBatch(contents);
  const timestamp = now();

  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i]!;
    const embedding = embeddings[i];
    if (!embedding) continue;

    await db.insert(messageEmbeddings).values({
      messageId: gap.id,
      conversationId: gap.conversationId,
      userId: gap.userId,
      content: gap.content,
      embedding,
      searchDocument: gap.content,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return { processed: gaps.length };
}

export async function backfillNoteEmbeddings(
  payload: { batchSize?: number },
  dependencies: BackfillDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();
  const batchSize = payload.batchSize ?? 50;

  const gaps = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      userId: notes.userId,
    })
    .from(notes)
    .leftJoin(noteEmbeddings, eq(noteEmbeddings.noteKey, notes.id))
    .where(isNull(noteEmbeddings.id))
    .limit(batchSize);

  if (gaps.length === 0) {
    return { processed: 0 };
  }

  const contents = gaps.map((g) =>
    [g.title, g.content].filter(Boolean).join("\n"),
  );
  const embeddings = await embedBatch(contents);
  const timestamp = now();

  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i]!;
    const embedding = embeddings[i];
    if (!embedding) continue;

    await db.insert(noteEmbeddings).values({
      userId: gap.userId,
      noteKey: gap.id,
      content: contents[i]!,
      embedding,
      searchDocument: contents[i]!,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return { processed: gaps.length };
}

export async function backfillTaskEmbeddings(
  payload: { batchSize?: number },
  dependencies: BackfillDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();
  const batchSize = payload.batchSize ?? 50;

  const gaps = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      userId: tasks.userId,
    })
    .from(tasks)
    .leftJoin(taskEmbeddings, eq(taskEmbeddings.taskKey, tasks.id))
    .where(isNull(taskEmbeddings.id))
    .limit(batchSize);

  if (gaps.length === 0) {
    return { processed: 0 };
  }

  const contents = gaps.map((g) =>
    [g.title, g.description].filter(Boolean).join("\n"),
  );
  const embeddings = await embedBatch(contents);
  const timestamp = now();

  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i]!;
    const embedding = embeddings[i];
    if (!embedding) continue;

    await db.insert(taskEmbeddings).values({
      userId: gap.userId,
      taskKey: gap.id,
      content: contents[i]!,
      embedding,
      searchDocument: contents[i]!,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return { processed: gaps.length };
}

export const backfillMessageEmbeddingsTask = task({
  id: "backfill-message-embeddings",
  maxDuration: 600,
  retry: { maxAttempts: 2 },
  run: async (payload: { batchSize?: number; userId?: string }) => {
    return backfillMessageEmbeddings(payload);
  },
});

export const backfillNoteEmbeddingsTask = task({
  id: "backfill-note-embeddings",
  maxDuration: 600,
  retry: { maxAttempts: 2 },
  run: async (payload: { batchSize?: number }) => {
    return backfillNoteEmbeddings(payload);
  },
});

export const backfillTaskEmbeddingsTask = task({
  id: "backfill-task-embeddings",
  maxDuration: 600,
  retry: { maxAttempts: 2 },
  run: async (payload: { batchSize?: number }) => {
    return backfillTaskEmbeddings(payload);
  },
});
