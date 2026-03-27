import type { IdMap } from "../id-map";
import type { ConvexAttachment } from "../types";
import { int, ts, tsOpt } from "./utils";

export interface PgAttachmentRow {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  type: string;
  key: string;
  bucket: string;
  name: string;
  mimeType: string;
  size: number;
  metadata: unknown;
  extractedText: string | null;
  extractionError: string | null;
  extractedAt: number | null;
  createdAt: number;
}

/**
 * Transform Convex attachment to PG row.
 *
 * The `key` is set to a placeholder based on the Convex storageId.
 * Actual blob migration (Convex storage -> R2) is a separate step
 * that will update the key to the real R2 path.
 */
export function transformAttachment(
  doc: ConvexAttachment,
  idMap: IdMap,
  bucket: string,
): PgAttachmentRow {
  const userId = idMap.get("users", doc.userId);
  const conversationId = idMap.get("conversations", doc.conversationId);
  const messageId = idMap.get("messages", doc.messageId);

  // Placeholder key — will be updated by blob migrator with real R2 path
  const key = `migration/${doc.storageId}/${doc.name}`;

  return {
    id: idMap.get("attachments", doc._id),
    messageId,
    conversationId,
    userId,
    type: doc.type,
    key,
    bucket,
    name: doc.name,
    mimeType: doc.mimeType,
    size: int(doc.size),
    metadata: doc.metadata ?? null,
    extractedText: doc.extractedText ?? null,
    extractionError: doc.extractionError ?? null,
    extractedAt: tsOpt(doc.extractedAt),
    createdAt: ts(doc.createdAt),
  };
}
