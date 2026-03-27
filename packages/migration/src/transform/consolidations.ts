import type { IdMap } from "../id-map";
import type { ConvexMessage } from "../types";
import { ts } from "./utils";

export interface PgConsolidationRow {
  id: string;
  comparisonGroupId: string;
  conversationId: string | null;
  userMessageId: string | null;
  consolidatedMessageId: string | null;
  modelId: string;
  status: string;
  metadata: unknown;
  createdAt: number;
  updatedAt: number;
}

/**
 * Derive a consolidation row from a Convex message that has isConsolidation=true.
 *
 * In Convex, consolidations are implicit (flag on messages).
 * In PG, there's a separate `consolidations` table.
 */
export function transformConsolidation(
  doc: ConvexMessage,
  idMap: IdMap,
): PgConsolidationRow | null {
  if (!doc.isConsolidation || !doc.comparisonGroupId) return null;

  return {
    id: idMap.get("consolidations", `${doc._id}_consol`),
    comparisonGroupId: doc.comparisonGroupId,
    conversationId:
      idMap.getOptional("conversations", doc.conversationId) ?? null,
    userMessageId: null, // Not directly available from the consolidation message
    consolidatedMessageId: idMap.get("messages", doc._id),
    modelId: doc.model ?? "unknown",
    status: doc.status === "complete" ? "completed" : doc.status,
    metadata: null,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
