import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  attachments,
  createNeonDatabase,
  fileChunks,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";

const CHARS_PER_TOKEN = 4;
const CHUNK_SIZE_CHARS = 500 * CHARS_PER_TOKEN;
const OVERLAP_SIZE_CHARS = 75 * CHARS_PER_TOKEN;

type EmbedBatch = (values: string[]) => Promise<number[][]>;

export interface EmbedFileDependencies {
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

function chunkText(text: string) {
  if (text.length === 0) {
    return [] as Array<{
      content: string;
      chunkIndex: number;
      charOffset: number;
      tokenCount: number;
    }>;
  }

  if (text.length <= CHUNK_SIZE_CHARS) {
    return [
      {
        content: text,
        chunkIndex: 0,
        charOffset: 0,
        tokenCount: Math.ceil(text.length / CHARS_PER_TOKEN),
      },
    ];
  }

  const chunks: Array<{
    content: string;
    chunkIndex: number;
    charOffset: number;
    tokenCount: number;
  }> = [];
  let charOffset = 0;
  let chunkIndex = 0;

  while (charOffset < text.length) {
    const endOffset = Math.min(charOffset + CHUNK_SIZE_CHARS, text.length);
    const content = text.slice(charOffset, endOffset);

    chunks.push({
      content,
      chunkIndex,
      charOffset,
      tokenCount: Math.ceil(content.length / CHARS_PER_TOKEN),
    });

    charOffset += CHUNK_SIZE_CHARS - OVERLAP_SIZE_CHARS;
    chunkIndex += 1;
  }

  return chunks;
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

export async function embedAttachmentFile(
  payload: {
    attachmentId?: string;
    fileId?: string;
  },
  dependencies: EmbedFileDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();
  const attachmentId = payload.attachmentId ?? payload.fileId;

  if (!attachmentId) {
    throw new Error("attachmentId is required");
  }

  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
  });

  if (!attachment) {
    return { success: true, skipped: "not_found" as const, chunkCount: 0 };
  }

  const extractedText = attachment.extractedText?.trim();
  if (!extractedText) {
    return { success: true, skipped: "no_text" as const, chunkCount: 0 };
  }

  const chunks = chunkText(extractedText);
  if (chunks.length === 0) {
    return { success: true, skipped: "empty_text" as const, chunkCount: 0 };
  }

  const embeddings = await embedBatch(chunks.map((chunk) => chunk.content));

  // Atomic replace: the delete runs as a data-modifying CTE on the insert, so
  // both happen in one statement (one implicit transaction). The neon-http
  // driver used in production does not support interactive transactions, so a
  // db.transaction() wrapper is not an option here.
  const purged = db
    .$with("purged")
    .as(
      db
        .delete(fileChunks)
        .where(eq(fileChunks.attachmentId, attachment.id))
        .returning(),
    );
  await db
    .with(purged)
    .insert(fileChunks)
    .values(
      chunks.map((chunk, index) => ({
        attachmentId: attachment.id,
        conversationId: attachment.conversationId,
        userId: attachment.userId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        searchDocument: chunk.content,
        embedding: embeddings[index] ?? [],
        metadata: {
          charOffset: chunk.charOffset,
          tokenCount: chunk.tokenCount,
        },
        createdAt: now(),
      })),
    );

  return {
    success: true,
    chunkCount: chunks.length,
  };
}

export const embedFileTask = task({
  id: "embed-file",
  // Serialize per entity: enqueuers pass concurrencyKey=attachmentId so each
  // attachment gets its own single-slot queue.
  queue: { concurrencyLimit: 1 },
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { attachmentId?: string; fileId?: string }) => {
    return embedAttachmentFile(payload);
  },
});
