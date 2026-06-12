import {
  createTriggerClient,
  knowledgeChunks,
  knowledgeSources,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq, sql } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
  /^([a-zA-Z0-9_-]{11})$/,
];

function extractYouTubeVideoId(url: string) {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function toApiKnowledgeSource(source: typeof knowledgeSources.$inferSelect) {
  return {
    _id: source.id,
    title: source.title,
    type: source.type as "file" | "text" | "web" | "youtube",
    status: source.status as "pending" | "processing" | "completed" | "failed",
    description: source.description ?? undefined,
    chunkCount: source.chunkCount ?? undefined,
    url: source.url ?? undefined,
    storageId: source.storageKey ?? undefined,
    mimeType: source.mimeType ?? undefined,
    size: source.size ?? undefined,
    error: source.error ?? undefined,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function toApiKnowledgeChunk(chunk: typeof knowledgeChunks.$inferSelect) {
  const metadata =
    chunk.metadata && typeof chunk.metadata === "object" ? chunk.metadata : {};

  return {
    _id: chunk.id,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    tokenCount:
      typeof metadata.tokenCount === "number" ? metadata.tokenCount : 0,
    pageNumber:
      typeof metadata.pageNumber === "number" ? metadata.pageNumber : undefined,
    startTime:
      typeof metadata.startTime === "string" ? metadata.startTime : undefined,
    endTime:
      typeof metadata.endTime === "string" ? metadata.endTime : undefined,
  };
}

async function assertOwnedKnowledgeSource(
  clerkUserId: string,
  sourceId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const source = await db.query.knowledgeSources.findFirst({
    where: and(
      eq(knowledgeSources.id, sourceId),
      eq(knowledgeSources.userId, user.id),
    ),
  });

  if (!source) {
    throw new Error("Knowledge source not found");
  }

  return { db, user, source };
}

async function enqueueProcessing(sourceId: string) {
  const trigger = createTriggerClient(parsePersistenceEnv(process.env));
  await trigger.triggerTask(
    "process-source",
    { sourceId },
    { concurrencyKey: sourceId },
  );
}

export async function listKnowledgeSources(
  clerkUserId: string,
  input: { projectId?: string | null } = {},
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.knowledgeSources.findMany({
    where: and(
      eq(knowledgeSources.userId, user.id),
      input.projectId === undefined
        ? sql`${knowledgeSources.projectId} is null`
        : input.projectId === null
          ? sql`${knowledgeSources.projectId} is null`
          : eq(knowledgeSources.projectId, input.projectId),
    ),
    orderBy: [desc(knowledgeSources.createdAt)],
  });

  return rows.map(toApiKnowledgeSource);
}

export async function countKnowledgeSources(
  clerkUserId: string,
  input: { projectId?: string | null } = {},
) {
  const items = await listKnowledgeSources(clerkUserId, input);
  return { count: items.length };
}

export async function getKnowledgeSourceWithChunks(
  clerkUserId: string,
  sourceId: string,
) {
  const { db, source } = await assertOwnedKnowledgeSource(
    clerkUserId,
    sourceId,
  );
  const chunks = await db.query.knowledgeChunks.findMany({
    where: eq(knowledgeChunks.sourceKey, source.id),
    orderBy: [knowledgeChunks.chunkIndex],
  });

  return {
    ...toApiKnowledgeSource(source),
    chunks: chunks.map(toApiKnowledgeChunk),
  };
}

export async function createKnowledgeSource(
  clerkUserId: string,
  input:
    | {
        type: "file";
        title: string;
        projectId?: string | null;
        storageId: string;
        mimeType: string;
        size: number;
      }
    | {
        type: "text";
        title: string;
        projectId?: string | null;
        content: string;
      }
    | {
        type: "web";
        title: string;
        projectId?: string | null;
        url: string;
      }
    | {
        type: "youtube";
        title: string;
        projectId?: string | null;
        url: string;
      },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const now = Date.now();

  const values =
    input.type === "file"
      ? {
          userId: user.id,
          projectId: input.projectId ?? null,
          type: "file" as const,
          title: input.title,
          storageKey: input.storageId,
          mimeType: input.mimeType,
          size: input.size,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        }
      : input.type === "text"
        ? {
            userId: user.id,
            projectId: input.projectId ?? null,
            type: "text" as const,
            title: input.title,
            rawContent: input.content,
            status: "pending",
            createdAt: now,
            updatedAt: now,
          }
        : input.type === "web"
          ? {
              userId: user.id,
              projectId: input.projectId ?? null,
              type: "web" as const,
              title: input.title,
              url: input.url,
              status: "pending",
              createdAt: now,
              updatedAt: now,
            }
          : (() => {
              const videoId = extractYouTubeVideoId(input.url);
              if (!videoId) {
                throw new Error("Invalid YouTube URL");
              }

              return {
                userId: user.id,
                projectId: input.projectId ?? null,
                type: "youtube" as const,
                title: input.title,
                url: input.url,
                videoMetadata: { videoId },
                status: "pending",
                createdAt: now,
                updatedAt: now,
              };
            })();

  const [source] = await db.insert(knowledgeSources).values(values).returning();

  if (!source) {
    throw new Error("Failed to create knowledge source");
  }

  await enqueueProcessing(source.id);
  return toApiKnowledgeSource(source);
}

export async function reprocessKnowledgeSource(
  clerkUserId: string,
  sourceId: string,
) {
  const { db, source } = await assertOwnedKnowledgeSource(
    clerkUserId,
    sourceId,
  );
  await db
    .update(knowledgeSources)
    .set({
      status: "pending",
      error: null,
      updatedAt: Date.now(),
    })
    .where(eq(knowledgeSources.id, source.id));
  await enqueueProcessing(source.id);
  return { sourceId: source.id, queued: true };
}

export async function deleteKnowledgeSource(
  clerkUserId: string,
  sourceId: string,
) {
  const { db, source } = await assertOwnedKnowledgeSource(
    clerkUserId,
    sourceId,
  );
  await db
    .delete(knowledgeChunks)
    .where(eq(knowledgeChunks.sourceKey, source.id));
  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, source.id));
  return { deleted: true, sourceId: source.id };
}
