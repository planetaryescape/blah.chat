import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  createNeonDatabase,
  createR2Client,
  createSignedReadUrl,
  type KnowledgeSource,
  knowledgeChunks,
  knowledgeSources,
  type PersistenceDb,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";
import { assertPublicHttpUrl, fetchPublicUrl } from "../lib/url-guard";
import { extractDocumentBlobText } from "./extract-text";

const CHARS_PER_TOKEN = 4;
const CHUNK_SIZE_CHARS = 500 * CHARS_PER_TOKEN;
const OVERLAP_SIZE_CHARS = 75 * CHARS_PER_TOKEN;

type EmbedBatch = (values: string[]) => Promise<number[][]>;
type ExtractContentResult = { text: string; title?: string };

export interface ProcessSourceDependencies {
  db?: PersistenceDb;
  now?: () => number;
  embedBatch?: EmbedBatch;
  extractContent?: (source: KnowledgeSource) => Promise<ExtractContentResult>;
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

async function fetchKnowledgeFileText(source: KnowledgeSource) {
  if (!source.storageKey || !source.mimeType) {
    throw new Error("Knowledge file source is missing storage metadata");
  }

  const env = parsePersistenceEnv(process.env);
  const r2 = createR2Client(env);
  const readUrl = await createSignedReadUrl({
    client: r2,
    bucket: env.r2.bucket,
    key: source.storageKey,
  });
  const response = await fetch(readUrl, {
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch knowledge file (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], {
    type: source.mimeType,
  });
  const extracted = await extractDocumentBlobText({
    blob,
    fileName: source.title,
    mimeType: source.mimeType,
    userId: source.userId,
  });

  return {
    text: extracted.text,
  };
}

async function fetchWebSource(url: string): Promise<ExtractContentResult> {
  // SSRF guard: reject private/internal targets before fetching anywhere.
  await assertPublicHttpUrl(url);

  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

  if (firecrawlApiKey) {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        data?: {
          markdown?: string;
          content?: string;
          metadata?: { title?: string };
        };
      };

      return {
        text: payload.data?.markdown || payload.data?.content || "",
        title: payload.data?.metadata?.title,
      };
    }
  }

  // Manual redirect handling: fetchPublicUrl re-runs the SSRF guard on every
  // hop (up to 3 redirects).
  const response = await fetchPublicUrl(url, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; blah-chat-bot/1.0; +https://blah.chat)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`);
  }

  const html = await response.text();
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    text,
    title,
  };
}

async function fetchYouTubeTranscript(
  source: KnowledgeSource,
): Promise<ExtractContentResult> {
  const videoId = source.videoMetadata?.videoId;
  if (!videoId) {
    throw new Error("Knowledge source is missing YouTube metadata");
  }

  const url = new URL("https://yt-transcript-api.vercel.app/api/transcript");
  url.searchParams.set("videoId", videoId);

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const payload = (await response.json()) as { transcript?: string };
      if (payload.transcript?.trim()) {
        return {
          text: payload.transcript,
        };
      }
    }
  } catch {
    // Fall through to a degraded but durable placeholder.
  }

  return {
    text: `YouTube video ${videoId}. Transcript unavailable at processing time.`,
  };
}

function createDefaultExtractContent() {
  return async (source: KnowledgeSource): Promise<ExtractContentResult> => {
    switch (source.type) {
      case "text":
        return {
          text: source.rawContent ?? "",
        };
      case "file":
        return fetchKnowledgeFileText(source);
      case "web":
        if (!source.url) {
          throw new Error("Knowledge web source is missing a URL");
        }
        return fetchWebSource(source.url);
      case "youtube":
        return fetchYouTubeTranscript(source);
      default:
        throw new Error(`Unsupported knowledge source type: ${source.type}`);
    }
  };
}

export async function processKnowledgeSource(
  payload: { sourceId: string },
  dependencies: ProcessSourceDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();
  const extractContent =
    dependencies.extractContent ?? createDefaultExtractContent();

  const source = await db.query.knowledgeSources.findFirst({
    where: eq(knowledgeSources.id, payload.sourceId),
  });

  if (!source) {
    return { success: true, skipped: "not_found" as const, chunkCount: 0 };
  }

  await db
    .update(knowledgeSources)
    .set({
      status: "processing",
      error: null,
      updatedAt: now(),
    })
    .where(eq(knowledgeSources.id, source.id));

  try {
    const extracted = await extractContent(source);
    const text = extracted.text.trim();
    const chunks = chunkText(text);

    if (chunks.length > 0) {
      const embeddings = await embedBatch(chunks.map((chunk) => chunk.content));

      // Atomic replace: the delete runs as a data-modifying CTE on the
      // insert, so both happen in one statement (one implicit transaction).
      // The neon-http driver used in production does not support interactive
      // transactions, so a db.transaction() wrapper is not an option here.
      const purged = db
        .$with("purged")
        .as(
          db
            .delete(knowledgeChunks)
            .where(eq(knowledgeChunks.sourceKey, source.id))
            .returning(),
        );
      await db
        .with(purged)
        .insert(knowledgeChunks)
        .values(
          chunks.map((chunk, index) => ({
            userId: source.userId,
            conversationId: null,
            sourceKey: source.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            searchDocument: chunk.content,
            embedding: embeddings[index] ?? [],
            metadata: {
              charOffset: chunk.charOffset,
              tokenCount: chunk.tokenCount,
              projectId: source.projectId ?? null,
              type: source.type,
            },
            createdAt: now(),
          })),
        );
    } else {
      await db
        .delete(knowledgeChunks)
        .where(eq(knowledgeChunks.sourceKey, source.id));
    }

    await db
      .update(knowledgeSources)
      .set({
        title:
          extracted.title && source.url && source.title === source.url
            ? extracted.title
            : source.title,
        status: "completed",
        error: null,
        chunkCount: chunks.length,
        processedAt: now(),
        updatedAt: now(),
      })
      .where(eq(knowledgeSources.id, source.id));

    return {
      success: true,
      chunkCount: chunks.length,
    };
  } catch (error) {
    await db
      .update(knowledgeSources)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        updatedAt: now(),
      })
      .where(eq(knowledgeSources.id, source.id));

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      chunkCount: 0,
    };
  }
}

export const processSourceTask = task({
  id: "process-source",
  // Serialize per entity: enqueuers pass concurrencyKey=sourceId so each
  // knowledge source gets its own single-slot queue.
  queue: { concurrencyLimit: 1 },
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: { sourceId: string }) => {
    return processKnowledgeSource(payload);
  },
});
