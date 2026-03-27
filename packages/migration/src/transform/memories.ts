import type { IdMap } from "../id-map";
import type { ConvexMemory } from "../types";
import { ts } from "./utils";

export interface PgMemoryEmbeddingRow {
  id: string;
  userId: string;
  conversationId: string | null;
  sourceMessageId: string | null;
  content: string;
  category: string | null;
  embedding: string;
  searchDocument: string | null;
  metadata: unknown;
  createdAt: number;
  updatedAt: number;
}

/**
 * Transform Convex memory to PG memory_embeddings.
 * Drops cognitive fields (memoryType, stability, accessCount, retention, memoryLinks).
 */
export function transformMemory(
  doc: ConvexMemory,
  idMap: IdMap,
): PgMemoryEmbeddingRow {
  return {
    id: idMap.get("memoryEmbeddings", doc._id),
    userId: idMap.get("users", doc.userId),
    conversationId:
      idMap.getOptional("conversations", doc.conversationId) ?? null,
    sourceMessageId: idMap.getOptional("messages", doc.sourceMessageId) ?? null,
    content: doc.content,
    category: doc.metadata.category ?? null,
    embedding: `[${doc.embedding.join(",")}]`,
    searchDocument: null,
    metadata: {
      importance: doc.metadata.importance,
      reasoning: doc.metadata.reasoning,
      confidence: doc.metadata.confidence,
    },
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
