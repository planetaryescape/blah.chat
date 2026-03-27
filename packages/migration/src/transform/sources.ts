import type { IdMap } from "../id-map";
import type { ConvexSource, ConvexSourceMetadata } from "../types";
import { int, ts } from "./utils";

export interface PgSourceMetadataRow {
  id: string;
  urlHash: string;
  url: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  favicon: string | null;
  siteName: string | null;
  enriched: boolean;
  error: string | null;
  firstSeenAt: number;
  lastAccessedAt: number;
  accessCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface PgMessageSourceRow {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string | null;
  position: number;
  provider: string;
  title: string;
  snippet: string | null;
  urlHash: string;
  url: string;
  isPartial: boolean;
  createdAt: number;
}

export function transformSourceMetadata(
  doc: ConvexSourceMetadata,
  idMap: IdMap,
): PgSourceMetadataRow {
  return {
    id: idMap.get("sourceMetadata", doc._id),
    urlHash: doc.urlHash,
    url: doc.url,
    title: doc.title ?? null,
    description: doc.description ?? null,
    ogImage: doc.ogImage ?? null,
    favicon: doc.favicon ?? null,
    siteName: doc.siteName ?? null,
    enriched: doc.enriched,
    error: doc.enrichmentError ?? null,
    firstSeenAt: ts(doc.firstSeenAt),
    lastAccessedAt: ts(doc.lastAccessedAt),
    accessCount: int(doc.accessCount),
    createdAt: ts(doc._creationTime),
    updatedAt: ts(doc.lastAccessedAt),
  };
}

export function transformSource(
  doc: ConvexSource,
  idMap: IdMap,
): PgMessageSourceRow {
  return {
    id: idMap.get("sources", doc._id),
    messageId: idMap.get("messages", doc.messageId),
    conversationId: idMap.get("conversations", doc.conversationId),
    userId: idMap.getOptional("users", doc.userId) ?? null,
    position: int(doc.position),
    provider: doc.provider,
    title: doc.title ?? "",
    snippet: doc.snippet ?? null,
    urlHash: doc.urlHash,
    url: doc.url,
    isPartial: doc.isPartial,
    createdAt: ts(doc.createdAt),
  };
}
