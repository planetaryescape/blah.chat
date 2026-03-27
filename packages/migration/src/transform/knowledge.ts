import type { IdMap } from "../id-map";
import type { ConvexKnowledgeChunk, ConvexKnowledgeSource } from "../types";
import { int, intOpt, ts, tsOpt } from "./utils";

export interface PgKnowledgeSourceRow {
  id: string;
  userId: string;
  projectId: string | null;
  type: string;
  title: string;
  description: string | null;
  storageKey: string | null;
  url: string | null;
  rawContent: string | null;
  videoMetadata: unknown;
  mimeType: string | null;
  size: number | null;
  status: string;
  error: string | null;
  chunkCount: number | null;
  processedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PgKnowledgeChunkRow {
  id: string;
  userId: string | null;
  conversationId: string | null;
  sourceKey: string;
  chunkIndex: number;
  content: string;
  searchDocument: string | null;
  embedding: string | null;
  metadata: unknown;
  createdAt: number;
}

export function transformKnowledgeSource(
  doc: ConvexKnowledgeSource,
  idMap: IdMap,
): PgKnowledgeSourceRow {
  return {
    id: idMap.get("knowledgeSources", doc._id),
    userId: idMap.get("users", doc.userId),
    projectId: idMap.getOptional("projects", doc.projectId) ?? null,
    type: doc.type,
    title: doc.title,
    description: doc.description ?? null,
    storageKey: doc.storageId ? `migration/knowledge/${doc.storageId}` : null,
    url: doc.url ?? null,
    rawContent: doc.rawContent ?? null,
    videoMetadata: doc.videoMetadata ?? null,
    mimeType: doc.mimeType ?? null,
    size: intOpt(doc.size),
    status: doc.status,
    error: doc.error ?? null,
    chunkCount: intOpt(doc.chunkCount),
    processedAt: tsOpt(doc.processedAt),
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}

export function transformKnowledgeChunk(
  doc: ConvexKnowledgeChunk,
  idMap: IdMap,
): PgKnowledgeChunkRow {
  return {
    id: idMap.get("knowledgeChunks", doc._id),
    userId: idMap.getOptional("users", doc.userId) ?? null,
    conversationId: null, // Convex chunks don't have conversationId
    sourceKey: idMap.get("knowledgeSources", doc.sourceId),
    chunkIndex: int(doc.chunkIndex),
    content: doc.content,
    searchDocument: null,
    embedding:
      doc.embedding && doc.embedding.length > 0
        ? `[${doc.embedding.join(",")}]`
        : null,
    metadata: null,
    createdAt: ts(doc.createdAt),
  };
}
