import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  createNeonDatabase,
  messageEmbeddings,
  messages,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";

type EmbedBatch = (values: string[]) => Promise<number[][]>;

export interface EmbedMessageDependencies {
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
    const result = await embedMany({
      model: EMBEDDING_MODEL,
      values,
    });
    return result.embeddings as number[][];
  };
}

export async function embedMessage(
  payload: { messageId: string },
  dependencies: EmbedMessageDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();

  const message = await db.query.messages.findFirst({
    where: eq(messages.id, payload.messageId),
  });

  if (!message) {
    return { success: true, skipped: "not_found" as const };
  }

  const content = message.content.trim();
  if (!content) {
    return { success: true, skipped: "empty_content" as const };
  }

  const [embedding] = await embedBatch([content]);
  if (!embedding) {
    return { success: true, skipped: "embed_failed" as const };
  }

  const timestamp = now();

  // Atomic upsert on the message_embeddings.message_id unique index — no
  // delete-then-insert window where the row is missing.
  await db
    .insert(messageEmbeddings)
    .values({
      messageId: message.id,
      conversationId: message.conversationId,
      userId: message.userId,
      content,
      embedding,
      searchDocument: content,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: messageEmbeddings.messageId,
      set: {
        conversationId: message.conversationId,
        userId: message.userId,
        content,
        embedding,
        searchDocument: content,
        updatedAt: timestamp,
      },
    });

  return { success: true };
}

export const embedMessageTask = task({
  id: "embed-message",
  // Serialize per entity: enqueuers pass concurrencyKey=messageId so each
  // message gets its own single-slot queue (stale runs can't clobber fresh).
  queue: { concurrencyLimit: 1 },
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { messageId: string }) => {
    return embedMessage(payload);
  },
});
