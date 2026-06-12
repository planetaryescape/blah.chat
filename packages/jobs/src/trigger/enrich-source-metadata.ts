import { createHash } from "node:crypto";
import {
  createNeonDatabase,
  messageSources,
  messages,
  type PersistenceDb,
  sourceMetadata,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { fetchPublicUrl } from "../lib/url-guard";

type FetchedMetadata = {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
};

export interface EnrichSourceMetadataDependencies {
  db?: PersistenceDb;
  now?: () => number;
  fetchMetadata?: (url: string) => Promise<FetchedMetadata>;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

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

async function fetchOpenGraphMetadata(url: string): Promise<FetchedMetadata> {
  // SSRF guard with manual redirect handling: re-validates every hop (max 3
  // redirects). Guard failures throw and are recorded as enrichment errors by
  // the caller's try/catch.
  const response = await fetchPublicUrl(url, {
    signal: AbortSignal.timeout(5_000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; blah-chat-bot/1.0; +https://blah.chat)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const title =
    html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(
    /<meta property="og:description" content="([^"]+)"/i,
  )?.[1];
  const image = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
  const siteName = html.match(
    /<meta property="og:site_name" content="([^"]+)"/i,
  )?.[1];
  const favicon =
    html.match(/<link rel="icon" href="([^"]+)"/i)?.[1] ??
    html.match(/<link rel="shortcut icon" href="([^"]+)"/i)?.[1];

  return {
    title,
    description,
    image,
    favicon,
    siteName,
  };
}

export async function enrichMessageSourcesMetadata(
  payload: { messageId: string; sourceUrls: string[] },
  dependencies: EnrichSourceMetadataDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const fetchMetadata = dependencies.fetchMetadata ?? fetchOpenGraphMetadata;

  const message = await db.query.messages.findFirst({
    where: eq(messages.id, payload.messageId),
  });

  if (!message) {
    return { success: true, enriched: 0, skipped: "not_found" as const };
  }

  let enriched = 0;

  for (const [index, rawUrl] of payload.sourceUrls.entries()) {
    const url = normalizeUrl(rawUrl);
    const urlHash = getUrlHash(url);
    let metadata: FetchedMetadata | null = null;
    let error: string | null = null;

    try {
      metadata = await fetchMetadata(url);
      enriched += 1;
    } catch (fetchError) {
      error =
        fetchError instanceof Error ? fetchError.message : String(fetchError);
    }

    const existingMetadata = await db.query.sourceMetadata.findFirst({
      where: eq(sourceMetadata.urlHash, urlHash),
    });

    if (existingMetadata) {
      await db
        .update(sourceMetadata)
        .set({
          url,
          title: metadata?.title ?? existingMetadata.title,
          description: metadata?.description ?? existingMetadata.description,
          ogImage: metadata?.image ?? existingMetadata.ogImage,
          favicon: metadata?.favicon ?? existingMetadata.favicon,
          siteName: metadata?.siteName ?? existingMetadata.siteName,
          enriched: metadata ? true : existingMetadata.enriched,
          error,
          lastAccessedAt: now(),
          accessCount: existingMetadata.accessCount + 1,
          updatedAt: now(),
        })
        .where(eq(sourceMetadata.id, existingMetadata.id));
    } else {
      await db.insert(sourceMetadata).values({
        urlHash,
        url,
        title: metadata?.title,
        description: metadata?.description,
        ogImage: metadata?.image,
        favicon: metadata?.favicon,
        siteName: metadata?.siteName,
        enriched: metadata !== null,
        error,
        firstSeenAt: now(),
        lastAccessedAt: now(),
        accessCount: 1,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    const existingSource = await db.query.messageSources.findFirst({
      where: and(
        eq(messageSources.messageId, message.id),
        eq(messageSources.urlHash, urlHash),
      ),
    });

    if (existingSource) {
      await db
        .update(messageSources)
        .set({
          title: metadata?.title ?? existingSource.title,
          url,
          snippet: metadata?.description ?? existingSource.snippet,
        })
        .where(eq(messageSources.id, existingSource.id));
    } else {
      await db.insert(messageSources).values({
        messageId: message.id,
        conversationId: message.conversationId,
        userId: message.userId,
        position: index + 1,
        provider: "unknown",
        title: metadata?.title ?? url,
        snippet: metadata?.description,
        urlHash,
        url,
        isPartial: false,
        createdAt: now(),
      });
    }
  }

  return {
    success: true,
    enriched,
  };
}

export const enrichSourceMetadataTask = task({
  id: "enrich-source-metadata",
  maxDuration: 60,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (payload: { messageId: string; sourceUrls: string[] }) => {
    return enrichMessageSourcesMetadata(payload);
  },
});
