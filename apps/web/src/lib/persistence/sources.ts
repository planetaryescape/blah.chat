import { createHash } from "node:crypto";
import {
  conversations,
  messageSources,
  messages,
  type PersistenceDb,
  sourceMetadata,
} from "@blah-chat/persistence-postgres";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { GenerationSource } from "@/lib/generation-v2/types";
import logger from "@/lib/logger";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

function normalizeUrl(input: string) {
  const parsed = new URL(input);
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.href;
}

function getUrlHash(url: string) {
  return createHash("sha256")
    .update(normalizeUrl(url))
    .digest("hex")
    .slice(0, 16);
}

type SourceRow = typeof messageSources.$inferSelect;
type SourceMetadataRow = typeof sourceMetadata.$inferSelect;

export type ApiMessageSource = {
  _id: string;
  _creationTime: number;
  messageId: string;
  conversationId: string;
  userId?: string;
  position: number;
  provider: string;
  title: string;
  snippet?: string;
  urlHash: string;
  url: string;
  isPartial: boolean;
  createdAt: number;
  metadata: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
    siteName?: string;
    enriched: boolean;
  } | null;
};

function toApiSource(
  row: SourceRow,
  metadata: SourceMetadataRow | undefined,
): ApiMessageSource {
  return {
    _id: row.id,
    _creationTime: row.createdAt,
    messageId: row.messageId,
    conversationId: row.conversationId,
    userId: row.userId ?? undefined,
    position: row.position,
    provider: row.provider,
    title: row.title,
    snippet: row.snippet ?? undefined,
    urlHash: row.urlHash,
    url: row.url,
    isPartial: row.isPartial,
    createdAt: row.createdAt,
    metadata: metadata
      ? {
          title: metadata.title ?? undefined,
          description: metadata.description ?? undefined,
          ogImage: metadata.ogImage ?? undefined,
          favicon: metadata.favicon ?? undefined,
          siteName: metadata.siteName ?? undefined,
          enriched: metadata.enriched,
        }
      : null,
  };
}

async function hydrateSources(db: PersistenceDb, rows: SourceRow[]) {
  if (rows.length === 0) {
    return [] as ApiMessageSource[];
  }

  const hashes = [...new Set(rows.map((row) => row.urlHash))];
  const metadataRows =
    hashes.length > 0
      ? await db.query.sourceMetadata.findMany({
          where: inArray(sourceMetadata.urlHash, hashes),
        })
      : [];
  const metadataByHash = new Map(
    metadataRows.map((row) => [row.urlHash, row] as const),
  );

  return rows
    .slice()
    .sort((left, right) => {
      if (left.messageId !== right.messageId) {
        return left.messageId.localeCompare(right.messageId);
      }
      if (left.position !== right.position) {
        return left.position - right.position;
      }
      return left.createdAt - right.createdAt;
    })
    .map((row) => toApiSource(row, metadataByHash.get(row.urlHash)));
}

export async function persistMessageSources(input: {
  db: PersistenceDb;
  messageId: string;
  conversationId: string;
  userId: string;
  provider: string;
  sources: GenerationSource[];
  now?: () => number;
}) {
  const now = input.now ?? (() => Date.now());
  let inserted = 0;
  const unenrichedUrls: string[] = [];

  for (const source of input.sources) {
    // One bad source must not abort persistence of the remaining sources.
    try {
      const normalizedUrl = normalizeUrl(source.url);
      const urlHash = getUrlHash(normalizedUrl);

      // Atomic upsert keyed on source_metadata_by_url_hash so concurrent
      // sessions citing the same URL cannot double-insert. A row coming back
      // with accessCount === 1 was freshly inserted (updates increment past
      // 1), preserving the "queue enrichment for new URLs only" behavior.
      const [metadataRow] = await input.db
        .insert(sourceMetadata)
        .values({
          urlHash,
          url: normalizedUrl,
          title: source.title,
          description: source.snippet,
          enriched: false,
          firstSeenAt: now(),
          lastAccessedAt: now(),
          accessCount: 1,
          createdAt: now(),
          updatedAt: now(),
        })
        .onConflictDoUpdate({
          target: sourceMetadata.urlHash,
          set: {
            url: normalizedUrl,
            title: sql`coalesce(${sourceMetadata.title}, ${source.title})`,
            lastAccessedAt: now(),
            accessCount: sql`${sourceMetadata.accessCount} + 1`,
            updatedAt: now(),
          },
        })
        .returning();

      if (metadataRow && metadataRow.accessCount === 1) {
        unenrichedUrls.push(normalizedUrl);
      }

      const existingSource = await input.db.query.messageSources.findFirst({
        where: and(
          eq(messageSources.messageId, input.messageId),
          eq(messageSources.urlHash, urlHash),
        ),
      });

      if (existingSource) {
        continue;
      }

      await input.db.insert(messageSources).values({
        messageId: input.messageId,
        conversationId: input.conversationId,
        userId: input.userId,
        position: source.position,
        provider: input.provider,
        title: source.title,
        snippet: source.snippet,
        urlHash,
        url: normalizedUrl,
        isPartial: false,
        createdAt: now(),
      });
      inserted += 1;
    } catch (error) {
      logger.warn(
        { err: error, messageId: input.messageId, sourceUrl: source.url },
        "Failed to persist message source",
      );
    }
  }

  return {
    inserted,
    unenrichedUrls,
  };
}

async function assertOwnedConversation(
  clerkUserId: string,
  conversationId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.userId, user.id),
    ),
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return { db, user, conversation };
}

export async function listConversationSources(
  clerkUserId: string,
  conversationId: string,
) {
  const { db } = await assertOwnedConversation(clerkUserId, conversationId);
  const rows = await db.query.messageSources.findMany({
    where: eq(messageSources.conversationId, conversationId),
    orderBy: [asc(messageSources.createdAt), asc(messageSources.position)],
  });

  return hydrateSources(db, rows);
}

export async function listMessageSources(
  clerkUserId: string,
  input: { messageIds: string[] },
) {
  if (input.messageIds.length === 0) {
    return [] as ApiMessageSource[];
  }

  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const candidateMessages = await db.query.messages.findMany({
    where: inArray(messages.id, input.messageIds),
  });

  if (candidateMessages.length === 0) {
    return [] as ApiMessageSource[];
  }

  const conversationIds = [
    ...new Set(candidateMessages.map((row) => row.conversationId)),
  ];
  const ownedConversations = await db.query.conversations.findMany({
    where: and(
      eq(conversations.userId, user.id),
      inArray(conversations.id, conversationIds),
    ),
  });
  const ownedConversationIds = new Set(
    ownedConversations.map((conversation) => conversation.id),
  );
  const ownedMessageIds = candidateMessages
    .filter((message) => ownedConversationIds.has(message.conversationId))
    .map((message) => message.id);

  if (ownedMessageIds.length === 0) {
    return [] as ApiMessageSource[];
  }

  const rows = await db.query.messageSources.findMany({
    where: inArray(messageSources.messageId, ownedMessageIds),
    orderBy: [asc(messageSources.createdAt), asc(messageSources.position)],
  });

  return hydrateSources(db, rows);
}
